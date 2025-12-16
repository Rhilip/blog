---
title: 使用 CF-Firewall 与 Nginx 联动限制访问频率以及自动ban IP
date: 2018-11-13 08:48:00
categories: Bash
tags: [cloudflare,nginx,pt-gen]
permalink: /archives/1031/
---

因为movieinfogen源站的原因，导致我原来公开的PT-Help工具的moveinfo/gen遭到了大量的使用，此外因为原先设计理念上的问题（ps. 不是因为我懒~~(事实就是，前面都是借口)~~），没有对相关请求做相关的身份验证。

导致部分人使用脚本批量请求该接口生成对应简介信息，以至于经常被豆瓣封请求，使得正常用户不可用。

**（滥用公开服务可耻！！！！为什么不自建！！！源代码都是公开的！！！**

> [请不要恶意使用PT-Gen【pt吧】_百度贴吧](https://tieba.baidu.com/p/5938778095)

![128cf51f3a292df5aa252f46b1315c6035a87365.jpg](/images/2018/11/3214407334.jpg)

--------

那么就来做些限制吧。（想不到我一个写爬虫开始学编程的人如今也要开始做反爬了23333

## 使用Nginx对User-Agent限制

这是最开始想到的办法，因为很早之前我就使用了 [mitchellkrogza/nginx-ultimate-bad-bot-blocker](https://github.com/mitchellkrogza/nginx-ultimate-bad-bot-blocker) 的相关规则以及自动更新模块，来对一些Bad Bot基于UA头进行限制。

关于这一系列规则的安装还请见其项目的README就行，挺简单的，唯一有些不便的就是它所有的配置都是围绕使用包管理器安装的Nginx来进行的，每次使用都需要夹带相关参数来覆盖默认配置。

所以记得用`-h`多看对应说明，没确认前千万不要用`-x`执行。

因为当初的安装记录找不到了，这里就贴一下crontab升级时候使用的吧，希望对同样使用lnmp.org提供的lnmp一件包的朋友有帮助。

```crontab
00 22 * * * sudo /usr/local/sbin/update-ngxblocker -c /usr/local/nginx/conf/ -b /usr/local/nginx/conf/bot.d/ -n Y
```

**注意：**安装后，可能会通不过Nginx的检验。。记得注释掉没过的就ok。。

该规则自带空白模块，允许用户在`bot.d`目录下的`blacklist-user-agents.conf`中添加基于UA的屏蔽，因为原滥用者都是使用脚本调用curl来进行的，所以直接屏蔽UA头为curl的。故在文件中添加

```nginx
"~*\bcurl\b"  3;
```

然而好景不长，毕竟UA头都是可以伪造的，简单的一个`IE`就直接破解了2333

![TIM截图20181113101412.png](/images/2018/11/2690547024.png)


## Nginx自带的 rate_limit

通过对访问频率来限制，相关的教程可见官方的文档：

- [NGINX Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)
- [Module ngx_http_limit_req_module](http://nginx.org/en/docs/http/ngx_http_limit_req_module.html)

考虑到使用的方便，毕竟这个`/tools`下不止挂了本人的movieinfogen服务，所以简单设置如下：

```nginx
limit_req_zone $binary_remote_addr zone=pthelp:10m rate=5r/m;
server
    {
        server_name api.rhilip.info ;
		
		location ~* ^/tool(/.*)?$ {
               limit_req zone=pthelp burst=3 nodelay;
			   # ....
	    }
	}
```

相对较为宽松，仅限制了每分钟5个请求，而且还补充了burst和nodelay项。对超过限制的直接返回503就行~

这个破起来多简单，我当初自己爬豆瓣的时候都知道`time.sleep()`，滥用者会想不到吗？

503的话就休息一段时间。或者可以都不用这么这样，反正Nginx最后一定会放行的，疯狂请求不就ok了吗？

![TIM截图20181113095353.png](/images/2018/11/935362719.png)

>  ps. 这个IP的同学在我**一天**的Nginx记录中疯狂刷出了近2000条记录，其中返回503的就有近1700条。。。。

## 使用 CF-Firewall 基于IP自动限制

根据对之前的访问频率的判断，我们可以知道，正常用户一天的请求量不会超过50次。~~（不，是我瞎讲的，不是基于统计的结果）~~

大体只有爬虫会疯狂的进行请求，所以我们不如根据总访问次数来对爬虫IP进行限制。

但是由于网站在Cloudflare的CDN之后，所以直接在系统层面使用iptables以及配套日志分析脚本对单一IP进行限制是不可能的，如果在Nginx上使用deny则每次修改都要重新reload较为麻烦，所以不如直接使用CF-Firewall进行限制较为方便。

> 与之有关的项目 [SukkaW/cloudflare-block-bad-bot-ruleset](https://github.com/SukkaW/cloudflare-block-bad-bot-ruleset)

手动添加可以直接在网页上使用Firewall面板，并设置规则为Block即可。
![1542076072900.png](/images/2018/11/4220804549.png)

通过日志可以看到确实被有效的屏蔽了~~~

通过试验，以CF-Firewall屏蔽会返回404状态码。

![1542076267675.png](/images/2018/11/252799684.png)

----------

但是毕竟我们不可能时时刻刻都查看日志吧，所以需要用脚本自动分析日志并通过CF-API来自动禁用对应IP。

CF的Global API Key在profile面板获取。

示例脚本如下

```python
import re
import CloudFlare
from collections import Counter

# 基本信息 开始
CF_API_KEY = ''
CF_API_EMAIL = ''
DOMAIN = ''
LOG_FILE = ''
MAX_RATE = 50
# 基本信息 结束

# 后面无需更改
cf = CloudFlare.CloudFlare(email = CF_API_EMAIL, token = CF_API_KEY)
zone_info = cf.zones.get(params = {
  'name': DOMAIN
})
zone_id = zone_info[0]['id']

# 获取当前被封禁IP列表防止重复插入
ip_ban_list_raw = cf.zones.firewall.access_rules.rules.get(zone_id, params = {
  "configuration.target": "ip",
  "mode": "block"
})
ip_ban_list = list(map(lambda x: x["configuration"]["value"], ip_ban_list_raw))

# 获取当前访问日志信息
with open(LOG_FILE, 'r') as f:
  log_now = f.readlines()

# 获取访问ip地址
movieinfo_gen_log = list(filter(lambda x: re.search("movieinfo/gen", x), log_now))
ip_log = list(filter(lambda x: x not in ip_ban_list, map(lambda x: re.search("^(.+?) - - \[", x).group(1), movieinfo_gen_log)))

# 使用Counter来计数， 并筛选
ip_count = Counter(ip_log).most_common()
ban_ip_list = list(filter(lambda x: x[1] > MAX_RATE, ip_count))

# 自动禁用
for ip, count in ban_ip_list:
  cf.zones.firewall.access_rules.rules.post(zone_id, data = {
    "mode": "block",
    "configuration": {
      "target": "ip",
      "value": ip
    },
    "notes": "Pt-Gen max-rate reached."
  })
```

然后放到crontab中每隔几分钟运行一次不久ok了吗？

## 后续注意点

1. Nginx使用`set_real_ip_from`模块从Cloudflare中获取用户真实IP地址，并记录到access_log中。相关方法将之前Blog： [Cloudflare 下 Nginx 获取用户真实 IP 地址 - R 酱小窝](https://blog.rhilip.info/archives/256/)
2. **上述示例脚本真的仅作示意**，临时现写的。~~所以为什么宁愿多写一个脚本也不修改原有架构呀~~

