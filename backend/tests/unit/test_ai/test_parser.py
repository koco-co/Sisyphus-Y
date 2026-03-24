"""AI 输出解析器回归测试。"""

from __future__ import annotations

from app.ai.parser import (
    _extract_json,
    _strip_trailing_commas,
    _try_repair_truncated_json,
    parse_test_cases,
)


class TestParseTestCases:
    def test_parse_test_cases_from_keyed_json_object(self):
        """带用例编号键名的 JSON 对象应被解析为结构化用例。"""
        text = """```json
{
  "用例: TC-迭代16-001": {
    "title": "[P0]-数据目录发布流程-数据目录发布流程审批通过",
    "priority": "P0",
    "case_type": "normal",
    "steps": [
      {
        "step": "1. 登录系统，进入数据目录发布流程页面",
        "expect": "系统显示数据目录发布流程页面"
      },
      {
        "step": "2. 选择L2目录，填写其他必填项",
        "expect": "系统根据选择的L2目录内容回显其他所有必填项"
      }
    ]
  }
}
```"""

        cases = parse_test_cases(text)

        assert len(cases) == 1
        assert cases[0]["title"] == "[P0]-数据目录发布流程-数据目录发布流程审批通过"
        assert cases[0]["priority"] == "P0"
        assert cases[0]["case_type"] == "functional"
        assert cases[0]["steps"] == [
            {
                "step_num": 1,
                "action": "1. 登录系统，进入数据目录发布流程页面",
                "expected_result": "系统显示数据目录发布流程页面",
            },
            {
                "step_num": 2,
                "action": "2. 选择L2目录，填写其他必填项",
                "expected_result": "系统根据选择的L2目录内容回显其他所有必填项",
            },
        ]

    def test_rejects_exception_case_with_multiple_negative_conditions(self):
        """异常用例如果合并多个逆向条件，应被解析层过滤。"""
        text = """[
  {
    "title": "验证名称为空或类型未选择时不可提交",
    "priority": "P1",
    "case_type": "exception",
    "precondition": "用户已进入创建页面",
    "steps": [
      {
        "step_num": 1,
        "action": "进入【创建任务】页面",
        "expected_result": "成功进入【创建任务】页面"
      },
      {
        "step_num": 2,
        "action": "名称留空或不选择类型，点击【提交】按钮",
        "expected_result": "系统提示校验失败"
      }
    ]
  }
]"""

        cases = parse_test_cases(text)

        assert cases == []

    def test_rejects_case_with_fuzzy_test_data(self):
        """包含“例如/合适的值”等模糊测试数据的用例不应进入后续链路。"""
        text = """[
  {
    "title": "验证新建任务功能正常工作",
    "priority": "P1",
    "case_type": "normal",
    "precondition": "用户已登录系统并具备新建权限",
    "steps": [
      {
        "step_num": 1,
        "action": "进入【任务管理-新建任务】页面",
        "expected_result": "成功进入【任务管理-新建任务】页面"
      },
      {
        "step_num": 2,
        "action": "在名称字段输入例如可用的值，点击【提交】按钮",
        "expected_result": "系统提示操作成功"
      }
    ]
  }
]"""

        cases = parse_test_cases(text)

        assert cases == []

    def test_trailing_comma_in_json(self):
        """尾随逗号应被自动修复。"""
        text = """[
  {
    "title": "验证创建任务-填写完整信息提交",
    "priority": "P1",
    "case_type": "functional",
    "precondition": "用户已登录并拥有创建权限",
    "steps": [
      {
        "step_num": 1,
        "action": "进入【任务管理】页面",
        "expected_result": "页面成功加载，显示任务列表"
      },
    ],
  },
]"""
        cases = parse_test_cases(text)
        assert len(cases) == 1
        assert cases[0]["title"] == "验证创建任务-填写完整信息提交"

    def test_case_type_chinese_mapping(self):
        """中文 case_type 应映射到 DB 合法值。"""
        text = """[
  {
    "title": "验证边界值-名称最大长度",
    "priority": "P1",
    "case_type": "边界",
    "precondition": "用户已登录",
    "steps": [
      {
        "step_num": 1,
        "action": "进入【创建】页面",
        "expected_result": "页面加载完成"
      },
      {
        "step_num": 2,
        "action": "在名称输入框输入128个字符的字符串'a'*128",
        "expected_result": "系统接受输入，字符数显示为128/128"
      }
    ]
  }
]"""
        cases = parse_test_cases(text)
        assert len(cases) == 1
        assert cases[0]["case_type"] == "boundary"

    def test_normal_maps_to_functional(self):
        """旧 'normal' case_type 应映射到 'functional'。"""
        text = """[
  {
    "title": "验证登录功能-正确账号密码登录",
    "priority": "P0",
    "case_type": "normal",
    "precondition": "用户已注册账号admin",
    "steps": [
      {
        "step_num": 1,
        "action": "打开登录页面 http://example.com/login",
        "expected_result": "显示登录表单，包含用户名和密码输入框"
      },
      {
        "step_num": 2,
        "action": "输入用户名admin，密码Test@123，点击【登录】",
        "expected_result": "跳转到首页，顶栏显示当前用户名admin"
      }
    ]
  }
]"""
        cases = parse_test_cases(text)
        assert len(cases) == 1
        assert cases[0]["case_type"] == "functional"

    def test_short_title_rejected(self):
        """标题少于4个字符应被过滤。"""
        text = """[
  {
    "title": "测试",
    "priority": "P1",
    "case_type": "functional",
    "precondition": "",
    "steps": [{"step_num": 1, "action": "点击按钮", "expected_result": "弹出对话框"}]
  }
]"""
        cases = parse_test_cases(text)
        assert cases == []

    def test_expanded_fuzzy_keywords(self):
        """扩展后的模糊关键词应被过滤。"""
        text = """[
  {
    "title": "验证数据查询-选择筛选条件查询",
    "priority": "P1",
    "case_type": "functional",
    "precondition": "用户已登录",
    "steps": [
      {
        "step_num": 1,
        "action": "选择对应选项进行查询",
        "expected_result": "页面正常显示筛选后的数据列表"
      }
    ]
  }
]"""
        cases = parse_test_cases(text)
        assert cases == []


class TestExtractJson:
    def test_strip_trailing_commas(self):
        assert _strip_trailing_commas("[1, 2, 3, ]") == "[1, 2, 3]"
        assert _strip_trailing_commas('{"a": 1, }') == '{"a": 1}'

    def test_extract_json_bare_array(self):
        text = 'Here is the result: [{"a": 1}] done.'
        result = _extract_json(text)
        assert result == [{"a": 1}]

    def test_extract_json_fenced(self):
        text = '```json\n[{"b": 2}]\n```'
        result = _extract_json(text)
        assert result == [{"b": 2}]

    def test_repair_truncated_json(self):
        truncated = '[{"title": "test1", "val": 1}, {"title": "test2"'
        result = _try_repair_truncated_json(truncated)
        assert result is not None
        assert len(result) >= 1
        assert result[0]["title"] == "test1"
