/*
 * 在 Hexo 根目录下的 source/_data 文件夹中（没有的文件夹需要自己创建），新建一个 Yaml 配置文件，并命名为主题的名称，
 * 例如 Stun 主题，就叫做 stun.yml。然后将主题配置文件 _config.yml 里的内容复制到 stun.yml 中，这样 stun.yml
 * 就会覆盖 _config.yml。如果想要修改配置，直接修改 stun.yml 就好了。当用户更新主题或者开发者发布主题时，
 * 配置数据保存在 stun.yml 中，主题原来的配置文件 _config.yml 仍然是干净的。
 * */
hexo.on('generateBefore', function () {
  var rootConfig = hexo.config;

  if (hexo.locals.get) {
    // 获取 source/_data 目录下的文件
    var data = hexo.locals.get('data');

    // 如果存在 anatolo_config.yml 文件，就用它覆盖原来的配置文件
    if (data && data.anatolo_config) {
      hexo.theme.config = data.anatolo_config;
    }
  }

  hexo.theme.config.rootConfig = rootConfig;
});
