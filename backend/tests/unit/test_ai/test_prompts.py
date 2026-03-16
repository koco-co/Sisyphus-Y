"""T-UNIT-09 — Prompt Builder 单元测试（纯函数）"""

from __future__ import annotations

import re

from app.ai.prompts import (
    _MODULE_PROMPTS,
    DIAGNOSIS_FOLLOWUP_SYSTEM,
    DIAGNOSIS_SYSTEM,
    DIFF_SEMANTIC_SYSTEM,
    EXPLORATORY_SYSTEM,
    GENERATION_SYSTEM,
    RULE_DATAPLAT,
    RULE_FORMAT,
    RULE_QUALITY,
    RULE_SAFETY,
    SCENE_MAP_SYSTEM,
    assemble_prompt,
    get_system_prompt,
)


class TestAssemblePromptReturnsMessages:
    def test_basic_assembly(self):
        """组装后的 prompt 应包含 system prompt + rules + task instruction。"""
        result = assemble_prompt("diagnosis", "请分析以下需求文档")

        assert DIAGNOSIS_SYSTEM in result
        assert "RULE-FORMAT" in result
        assert "RULE-QUALITY" in result
        assert "RULE-SAFETY" in result
        assert "请分析以下需求文档" in result

    def test_assembly_includes_dataplat_for_eligible_modules(self):
        """diagnosis / generation / scene_map 应注入 RULE-DATAPLAT。"""
        for module in ["diagnosis", "generation", "scene_map"]:
            result = assemble_prompt(module, "task")
            assert "RULE-DATAPLAT" in result, f"{module} should include DATAPLAT rules"

    def test_assembly_excludes_dataplat_for_other_modules(self):
        """非数据中台模块不应注入 DATAPLAT。"""
        result = assemble_prompt("diff", "task")
        assert "RULE-DATAPLAT" not in result

    def test_assembly_with_team_standard(self):
        """传入 team_standard 时应包含在输出中。"""
        result = assemble_prompt("generation", "task", team_standard="## 自定义规范\n- 步骤使用中文")
        assert "自定义规范" in result

    def test_assembly_with_module_rules(self):
        result = assemble_prompt("generation", "task", module_rules="特殊规则：验证幂等性")
        assert "特殊规则" in result
        assert "模块专项规则" in result

    def test_assembly_with_output_preference(self):
        result = assemble_prompt("generation", "task", output_preference={"verbosity": "detailed", "language": "zh-CN"})
        assert "verbosity" in result
        assert "detailed" in result

    def test_assembly_with_rag_context(self):
        result = assemble_prompt("generation", "task", rag_context="相关知识：数据同步最佳实践...")
        assert "参考知识库" in result
        assert "数据同步最佳实践" in result

    def test_assembly_layer_order(self):
        """验证 7 层组装顺序：system > rules > team > module_rules > preference > rag > task。"""
        result = assemble_prompt(
            "diagnosis",
            "TASK_MARKER",
            team_standard="TEAM_MARKER",
            module_rules="MODULE_RULES_MARKER",
            output_preference={"key": "PREF_MARKER"},
            rag_context="RAG_MARKER",
        )
        idx_system = result.index("需求质量分析")
        idx_rules = result.index("RULE-FORMAT")
        idx_team = result.index("TEAM_MARKER")
        idx_module = result.index("MODULE_RULES_MARKER")
        idx_pref = result.index("PREF_MARKER")
        idx_rag = result.index("RAG_MARKER")
        idx_task = result.index("TASK_MARKER")

        assert idx_system < idx_rules < idx_team < idx_module < idx_pref < idx_rag < idx_task

    def test_unknown_module_falls_back_to_generation(self):
        """未知模块应 fallback 到 GENERATION_SYSTEM。"""
        result = assemble_prompt("unknown_module", "task")
        assert GENERATION_SYSTEM in result


class TestSystemPromptForEachModule:
    def test_all_modules_have_prompts(self):
        """所有已注册模块应有对应的 system prompt。"""
        expected = {"diagnosis", "scene_map", "generation", "diagnosis_followup", "diff", "exploratory"}
        assert set(_MODULE_PROMPTS.keys()) == expected

    def test_get_system_prompt_diagnosis(self):
        prompt = get_system_prompt("diagnosis")
        assert prompt == DIAGNOSIS_SYSTEM
        assert "数据中台" in prompt

    def test_get_system_prompt_scene_map(self):
        prompt = get_system_prompt("scene_map")
        assert prompt == SCENE_MAP_SYSTEM
        assert "测试点" in prompt

    def test_get_system_prompt_generation(self):
        prompt = get_system_prompt("generation")
        assert prompt == GENERATION_SYSTEM
        assert "用例" in prompt

    def test_get_system_prompt_diff(self):
        prompt = get_system_prompt("diff")
        assert prompt == DIFF_SEMANTIC_SYSTEM
        assert "变更" in prompt

    def test_get_system_prompt_unknown_fallback(self):
        prompt = get_system_prompt("nonexistent")
        assert prompt == GENERATION_SYSTEM

    def test_rules_not_empty(self):
        """所有系统规则不应为空。"""
        for rule in [RULE_FORMAT, RULE_QUALITY, RULE_DATAPLAT, RULE_SAFETY]:
            assert len(rule) > 50


class TestPromptIdentityAndFewshot:
    """PRM-02: 身份声明差异化测试 + PRM-03: Few-shot 存在性测试"""

    def test_identity_unique(self):
        """6 个模块的身份声明首句必须互不相同，且长度 > 30 字。"""
        prompts = {
            "diagnosis": DIAGNOSIS_SYSTEM,
            "scene_map": SCENE_MAP_SYSTEM,
            "generation": GENERATION_SYSTEM,
            "diagnosis_followup": DIAGNOSIS_FOLLOWUP_SYSTEM,
            "diff": DIFF_SEMANTIC_SYSTEM,
            "exploratory": EXPLORATORY_SYSTEM,
        }

        # 提取每个身份声明段落的首句（## ① 身份声明 后的第一行非空内容）
        identity_first_lines = []
        for name, prompt in prompts.items():
            match = re.search(r"## ① 身份声明\n(.+?)(?:\n\n|\n##)", prompt, re.DOTALL)
            assert match, f"{name} 缺少身份声明段落"
            first_line = match.group(1).strip().split("\n")[0].strip()
            assert len(first_line) > 30, f"{name} 身份声明首句过短（{len(first_line)} 字）"
            identity_first_lines.append((name, first_line))

        # 断言 6 个首句两两不同
        lines_only = [line for _, line in identity_first_lines]
        assert len(set(lines_only)) == 6, f"身份声明首句存在重复: {lines_only}"

    def test_fewshot_present(self):
        """GENERATION_SYSTEM 已有 Few-shot，其余 5 个模块也必须包含正例+负例。"""
        prompts_to_check = {
            "diagnosis": DIAGNOSIS_SYSTEM,
            "scene_map": SCENE_MAP_SYSTEM,
            "diagnosis_followup": DIAGNOSIS_FOLLOWUP_SYSTEM,
            "diff": DIFF_SEMANTIC_SYSTEM,
            "exploratory": EXPLORATORY_SYSTEM,
        }

        # GENERATION_SYSTEM 作为基准必须包含 Few-Shot
        assert "Few-Shot" in GENERATION_SYSTEM or "Few-shot" in GENERATION_SYSTEM or "正例" in GENERATION_SYSTEM

        for name, prompt in prompts_to_check.items():
            # 必须包含正例标记
            has_positive = "正例" in prompt or "✅" in prompt
            assert has_positive, f"{name} 缺少正例标记（正例 或 ✅）"

            # 必须包含负例标记
            has_negative = "负例" in prompt or "❌" in prompt
            assert has_negative, f"{name} 缺少负例标记（负例 或 ❌）"

    def test_four_section_structure(self):
        """所有 6 个模块必须包含四段式结构标头。"""
        prompts = {
            "diagnosis": DIAGNOSIS_SYSTEM,
            "scene_map": SCENE_MAP_SYSTEM,
            "generation": GENERATION_SYSTEM,
            "diagnosis_followup": DIAGNOSIS_FOLLOWUP_SYSTEM,
            "diff": DIFF_SEMANTIC_SYSTEM,
            "exploratory": EXPLORATORY_SYSTEM,
        }

        required_sections = ["## ① 身份声明", "## ② 任务边界", "## ③ 输出规范", "## ④ 质量红线"]

        for name, prompt in prompts.items():
            for section in required_sections:
                assert section in prompt, f"{name} 缺少段落标头: {section}"


class TestGLM5Config:
    """PRM-04: GLM-5 配置验证"""

    def test_glm5_config(self):
        """Settings 中 zhipu_model 默认值为 glm-5。

        注意：此测试验证代码中定义的默认值，而非运行时被 .env 覆盖后的值。
        通过 model_dump 获取字段默认值来避免环境变量干扰。
        """
        from app.core.config import Settings

        # 获取字段的默认值（而非被环境变量覆盖后的值）
        field_info = Settings.model_fields["zhipu_model"]
        assert field_info.default == "glm-5", f"zhipu_model 默认值期望 glm-5，实际为 {field_info.default}"
