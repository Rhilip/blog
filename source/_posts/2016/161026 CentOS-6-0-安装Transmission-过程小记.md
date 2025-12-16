---
title: CentOS 6.0 安装Transmission 过程小记
date: 2016-10-26 20:20:00
categories:
 - VPS
tags: 
 - CentOS
 - PT
 - Transmission
permalink: /archives/211/
---

为什么要写这篇文章那，网上的教程已经那么多了。

然而特喵我一个都用不了~
故自己写下。。。

<!--more-->

究其原因，每篇文章方法中获得安装源的都是同一个，但是！！那个源失效了，用wget的方法已经不能得到原rpm文件了。。。
好坑啊有没有~

好下面是正题。。
# 安装EPEL软件仓库

```bash
wget http://dl.fedoraproject.org/pub/epel/6/x86_64/epel-release-6-8.noarch.rpm
wget http://rpms.famillecollet.com/enterprise/remi-release-6.rpm
rpm -ivh epel-release-6-8.noarch.rpm
rpm -ivh remi-release-6.rpm
```

完成后的检查
```ls -1 /etc/yum.repos.d/epel* /etc/yum.repos.d/remi.repo```

如果返回，则说明安装成功。

![QQ20161026200545.jpg](/images/2016/2373848348.jpg)

然后为了避免直接使用yum、rpm等命令失效，报错“Error: Cannot retrieve metalink for repository: epel. Please verify its path and try again”，需要做些设置
```vi /etc/yum.repos.d/remi.repo```

编辑[remi]下的enabled选项从0设为1，baseurl前的#号去掉，mirrorlist前添加#号。正确配置如下：
```
[epel]
name=Extra Packages for Enterprise Linux 6 - $basearch
baseurl=http://download.fedoraproject.org/pub/epel/6/$basearch
#mirrorlist=https://mirrors.fedoraproject.org/metalink?repo=epel-6&amp;arch=$basearch
failovermethod=priority
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-EPEL-6 
```

# 安装transmission和transmission-daemon
然后就没有什么大问题了，按照网上步骤一步步走下去就好了
```yum install transmission transmission-daemon```

提示导入GPG Key的时候输y同意即可
```
Retrieving key from file:///etc/pki/rpm-gpg/GEEKERY-GPG-KEY
Importing GPG key 0xA4673575:
 Userid : Marco Spallacci &lt;marco.spallacci@gmail.com&gt;
 Package: geekery-release-6-1.noarch (installed)
 From   : /etc/pki/rpm-gpg/GEEKERY-GPG-KEY
Is this ok [y/N]: y
```

# 3、配置transmission配置文件
```vim /var/lib/transmission/.config/transmission/settings.json```
主要修改以下几项，如果要挂pt，请把dht、用户交换等选项关了
```json
    "rpc-authentication-required": true,
    "rpc-enabled": true,
    "rpc-password": "管理密码密码",
    "rpc-username": "管理用户名",
    "rpc-whitelist-enabled": false,
```

然后启动服务
```service transmission-daemon start```

你就可以使用 http://你的IP地址:9091/ 访问了，当然更建议使用transmission-gui在桌面端管理~

----------

# 后记
~原版transmission好差劲，卸了安装deluge。。~
（其实是没打界面补丁，另外配置中没加watch-dir项。后全线转Ubuntu，不再使用CentOS。
