---
title: 使用用户脚本/Redirector插件自动进行VPN访问域名替换
date: 2020-04-19 12:54:00
categories: userscript
tags: [userscript,easyconnect]
permalink: /archives/1230/
---

~~其实自从  豆瓣下载大师 之后，本人就很少写Userscript了。~~

正值疫情在家科研阶段，访问论文全文数据库均需要使用学校的VPN。但因为我们学校使用的是深信服的VPN服务，不是全局代理的形式，所以就出现访问知网或者Web of Science需要通过EasyConnect的面板进入，实属麻烦，且面板中没有我经常使用的ScienceDirect。

加之，本人对论文检索通常是以Google Scholars作为入口的，所以造成了一定的不便。

![image-20200419203720306.png](/images/2020/04/3798888545.png)

通过观察url地址变化，可以发现知网或者其他通过VPN访问的地址变成了如下形式

```
# 知网
https://www.cnki.net/xxxxxxx
https://www-cnki-net-s.vpn.xxxxxx.edu.cn:8118/xxxxx

# 万方
http://g.wanfangdata.com.cn/index.html
https://g-wanfangdata-com-cn.vpn.xxxxxx.edu.cn:8118/index.html

# 校内地址（示例）
http://10.10.100.100/index.html
https://10-10-100-100-p.vpn.xxxxxx.edu.cn:8118/index.html
```

也就是说把原始域名中的点改为`-`，如果使用https访问则加上`-s`，然后后面附加`.vpn.xxxxxx.edu.cn:8118`。而如果访问ip地址形式的域名，则需要先加上 `-s`，然后再附加 `.vpn.xxxxxx.edu.cn:8118` 参数。
但实际测试中发现，不加上 `-s`，会以302形式的跳转。


值得注意的是，VPN服务强制以https协议进行访问，所以如果之前是通过http协议访问的论文数据库，需要将schema参数改为`https:`。

![image-20200419204243264.png](/images/2020/04/593848570.png)

综上，我们可以通过UserScript的形式，将`windows.location.href`参数进行替换，达到网页自动切换到VPN中的要求。

初版代码如下，但目前未处理ip地址形式的域名（这种更建议直接通过资源列表进入）：

```javascript
// ==UserScript==
// @name         对学校VPN资源进行链接转换（深信服）
// @namespace    https://blog.rhilip.info/
// @version      0.1
// @author       Rhilip
// @match        *://*.sciencedirect.com/*
// @match        *://*.cnki.net/*
// @match        *://*.wanfangdata.com.cn/*
// @match        *://falvmen.com.cn/*
// @match        *://webofknowledge.com/*
// @match        *://*.engineeringvillage.com/*
// @match        *://*.springer.com/*
// @match        *://*.springerlink.com/*
// @run-at       document-start
// ==/UserScript==

let host_suffix = '.vpn.xxxxxx.edu.cn:8118';  // 请替换成自己学校的参数

(function() {
    'use strict';
    let new_href = location.href.replace(location.host, location.host.replace(/\./g,'-') + host_suffix);
    if (location.protocol === 'http:') {
        new_href = new_href.replace(location.protocol, 'https:');
    }

    location.href = new_href;
})();
```

如果后续要添加新的网站，也可以仿照目前`@match`的形式进行添加。

-------

由于userscript注入是在 `document-start`，此时页面主体部分已经请求完成。其瀑布图如下。

![image-20200419210118340.png](/images/2020/04/1673087105.png)

如果我们换种形式，使用[Redirector插件](https://chrome.google.com/webstore/detail/pajiegeliagebegjdhebejdlknciafen)，并作如下配置

![image-20200419210653994.png](/images/2020/04/1216212255.png)

我们可以看到Network面板的请求变成如下形式，对CNKI的访问以`307 Internal Redirect`的形式被直接重定向到了我们学校的VPN域名上，而不是通过Userscript的得到的200响应。这比使用userscript的形式响应更快，但由于该插件的设计，导致将`.`替换成`-`的步骤较难实现。

![image-20200419210608356.png](/images/2020/04/2628073234.png)

综合考虑后，使用userscript的形式更为简便23333
