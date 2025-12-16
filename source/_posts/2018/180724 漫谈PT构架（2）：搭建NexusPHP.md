---
title: 漫谈PT构架（2）：搭建NexusPHP
date: 2018-07-24 08:50:00
categories: knowledge
tags: [LNMP,PT,nexusphp,laragon]
permalink: /archives/964/
---

为了去了解站点构架，一个简单的搭建过程也是需要了解的。

NP搭建的最重要注意点是，**使用的PHP版本最高不应该超过5.6，并安装memcache软件及PHP扩展**。对数据库版本要求不是很严格，我使用MySQL 5.7测试可行。

> 本人写的十分简略~~（因为真心没有什么好讲的）~~，如果有必要，还请参照他人的详细搭建过程。

## Linux下搭建

### LNMP环境及Memcache

网上的教程真心啰嗦，lnmp一个一个的写过去，我个人还是喜欢用一键包来配置。lnmp1.5的自动值守命令为

```bash
screen -S lnmp
wget http://soft.vpser.net/lnmp/lnmp1.5.tar.gz -cO lnmp1.5.tar.gz && tar zxf lnmp1.5.tar.gz && cd lnmp1.5 && LNMP_Auto="y" DBSelect="2" DB_Root_Password="lnmp.org" InstallInnodb="y" PHPSelect="4" SelectMalloc="1" ./install.sh lnmp
```

复制粘贴，然后接杯奶茶等编译完成，我们基础的lnmp环境就搭建好了。（注意：这样安装后主PHP版本为5.5，如果希望主版本用7.x的请自己使用 [LNMP一键安装包无人值守命令生成器](https://lnmp.org/auto.html) 生成值守命令或者交互式安装，然后`./install.sh mphp ` 添加多PHP支持）

然后安装memcache，在lnmp1.5文件夹中进入lnmp解压后的目录，执行：`./addons.sh install memcached`。选择php-memcache即会安装软件及PHP扩展。

### NP源码及数据库

NP源码个人建议从SourceForge中获取，而不是从Github仓库。（之前Blog也说过，Github上的建表语句有问题）故，依次进行：

1. 从 [NexusPHP - Browse Files at SourceForge.net](https://sourceforge.net/projects/nexusphp/files/) 下载最新的zip包并解压到对应网站根目录即可。

2. 使用phpmyadmin或者其他CLI软件恢复`/_db/dbstructure.sql` 文件记录。

3. 修改`config/allconfig.php` 文件的以下内容使其对应：

   ```php
   ‘SITENAME’ => ‘站点名称’ 
   ‘baseURL’ => ‘网站URL’ 
   ‘announce_url’ => ‘localhost/announce.php’（announce的url地址） 
   ‘mysql_host’ => ‘MySQL主机’ 
   ‘mysql_user’ => ‘数据库用户名’ 
   ‘mysql_pass’ => ‘数据库密码’ 
   ‘mysql_db’ => ‘数据库名’
   ```

4. 设置目录权限777，因为NP的站点配置是通过操作config目录下文件的修改完成的。

   ```bash
   sudo chmod 777 /dir/to/your/nexusphp
   sudo chmod 777 /dir/to/your/nexusphp/config
   ```

5. 自己访问网站然后注册一个用户名，接着进入数据库管理（phpMyAdmin），在users表里面找到你注册的用户，编辑它的class属性为16

## Windows下搭建

Windows下搭建我个人推荐使用Laragon作为基础环境，因为相比其他WNMP、WAMP、XAMPP，环境管理更加方便，内置软件更为齐全。例如我选择的就包含了几乎全套我想要使用的工具2333

> 官网下载地址：https://laragon.org/download/

![laragon.jpg](/images/2018/07/3158755942.jpg)

然而需要注意的是，默认Laragon提供的是PHP 7.x，我们需要额外到PHP官网上下载PHP 5.5版本的Portable以及Memcache扩展。下载位置分别如下：

- PHP 5.5：到PHP官网的历史发布页面存档 https://windows.php.net/downloads/releases/archives/ 中找到*php-5.5.38-Win32-VC11-x64.zip* 下载并将解压到`laragon\bin\php` 目录
- php-memcache： http://pecl.php.net/package/memcache 中下载，并解压至 `laragon\bin\php\php-5.5.38-Win32-VC11-x64\ext`目录，之后你就可以在Laragon的切换PHP版本并启用该插件。

完成基础环境的搭建后，Win下关于NP自身的文件以及数据库均与Linux下类似，在此不累述。

## 搭建中一些可能的问题

- **直接提示HTTP ERROR 500** ：多数情况下是使用了PHP 7.x或者其他高于5.6的版本，建议使用PHP 5.3-5.5之间的版本进行搭建。
- **Warning: Memcache::connect() [memcache.connect]: Can’t connect to localhost: 由于连接方在一段时间后没有正确答复或连接的主机没有反应，连接尝试失败。**  ： 修改`classes\class_cache.php`中的localhost为127.0.0.1 
- **点击登陆后提示`Error: Errno:0 SQL:; `**： 使用Github上源码（这个源码真的是只能远观不能亵玩233）搭建，换用SourceForge的源。
- 其他待补充~
