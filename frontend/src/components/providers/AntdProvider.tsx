'use client';
import { ConfigProvider, App } from 'antd';
import zhCN from 'antd/locale/zh_CN';

const theme = {
  token: {
    colorPrimary: '#00d9a3',
    colorBgBase: '#0d0f12',
    colorTextBase: '#e2e8f0',
    colorBorder: '#2a313d',
    colorBgContainer: '#131619',
    colorBgElevated: '#1a1e24',
    borderRadius: 6,
    fontFamily: "'DM Sans', sans-serif",
  },
  components: {
    Table: { colorBgContainer: '#131619' },
    Modal: { contentBg: '#131619' },
    Drawer: { colorBgElevated: '#131619' },
  },
};

export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={theme} locale={zhCN}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
