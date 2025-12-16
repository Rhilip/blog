---
title: 通知：Pt-help和ourhelp合并
date: 2019-06-30 01:49:00
categories: notice
tags: [notice,pt-help,ourhelp]
permalink: /archives/1083/
---

因为功能相似，本人于之前建立的Pt-help（域名 `api.rhilip.info/tool`）已与ourhelp组 （域名 `api.ourhelp.club`）相关功能进行合并。

1. 目前ourhelp域名是仅供`ourbits.club`网站使用的。本人原域名将继续提供无CORS限制的接口。但两者共享同一资源池，共享同一个资源请求限制。

2. 原本人使用的 有`/tool`前缀的API point，由后端Nginx的rewrite方法提供，相关规则如下。原API使用者无需更换请求地址。但仍建议参照ourhelp域名下相关暴露方法修改请求地址。

    ```nginx
    location ~* ^/tool(/.*)?$ {        
        if ($host = 'api.rhilip.info') {
            rewrite ^(.*)/tool/movieinfo/gen(.*)$ $1/infogen$2 last;
            rewrite ^(.*)/tool/ptboard(.*)$ $1/ptboard$2 last;
            rewrite ^(.*)/tool/geo(.*)$ $1/geo$2 last;
       }
    }
    ```

3. ourhelp使用后端基于 [Rhilip/PT-help](https://github.com/Rhilip/PT-help) 修改，并闭源更新，符合原repo的开源协议MIT。
4. 注意：<https://api.rhilip.info> 仅允许使用https访问，而 api.ourhelp.club 同时支持http以及https协议访问。


Rhilip@ourhelp

2019.06.30

--------------------------

更新：

1. (2019.06.30) 因为无法解决的CORS问题，不再提供git-pages下的ptboard,ptanalytics,ptgen组件。使用gitpages会被meta自动跳转到api.rhilip.info下，建议更换收藏地址。
