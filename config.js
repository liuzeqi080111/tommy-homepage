/* 网站运行配置（前端公开配置）
 *
 * 说明：本文件会被公开访问，只能存放"公开密钥"。
 * - SUPABASE_ANON_KEY 是 Supabase 的公开密钥（Publishable key，等同于旧版 anon public key），
 *   它本身不是密码：数据库已开启行级安全策略（RLS），匿名身份只能"新增反馈"，
 *   不能读取、修改或删除任何数据。服务端的 Secret key 绝不能出现在这里。
 * - 修改方法：Supabase 控制台 → Settings → API Keys（Publishable key）；Project URL 见 Data API 页。
 */
window.APP_CONFIG = {
  // 项目地址（结尾不要带 /rest/v1，代码会自动拼接，写了也能自动纠正）
  SUPABASE_URL: 'https://fmkuzukyqsmeiiluaxmk.supabase.co',

  // 公开密钥（Publishable key）
  SUPABASE_ANON_KEY: 'sb_publishable_4QOUaVzMbaANCtPLIlmmlQ_fKqFBgo2',

  // 反馈数据表名（与 supabase/schema.sql 中一致）
  FEEDBACK_TABLE: 'feedback',

  // 当前站点版本号：访客提交反馈时自动附带，便于按版本分析意见
  SITE_VERSION: 'V4',

  // 数字分身后端地址。
  // 本地预览：'/api/chat'（由 server/chat_server.py 提供）
  // 公开站点：静态托管上没有该接口，构建脚本会自动置空，页面回退到内置规则式回答。
  CHAT_API: ''
};
