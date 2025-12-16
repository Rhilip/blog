---
title: 为OpenVZ构架VPS添加IPv6隧道
date: 2017-12-28 09:17
categories:
 - VPS
tags: 
 - IPv6
 - openvz
 - tb-tun
permalink: /archives/705/
---

前段时间的黑五，没注意看不小心淘到了不支持native IPv6的VPS。
没办法╮（╯＿╰）╭，只好自己去找方法支持。HE提供的IPv6 tunnel似乎就是最好的选择。

## 申请IPv6 tunnel
到 [tunnelbroker.net](https://tunnelbroker.net/ "tunnelbroker.net") 可以免费为具有公网IP的主机申请5个免费的IPv6隧道地址。
很简单的就不解释了，注册账号，然后点击“Create Regular Tunnel”就行。
如果不会的话，可以自己搜索或者看这篇文章 [HE Tunnel Broker IPv4转v6隧道使用图解](https://blog.ixnet.work/2016/05/08/tunnel-broker-tutorial/ "HE Tunnel Broker IPv4转v6隧道使用图解") 的**前面两项**。~~我就不做重点展开了~~

> 由于OpenVZ构架的限制，不能直接套用HE提供的配置信息。需要使用做其他设置。

## 启用TUN/TAP

到你VPS控制面板（如SolusVM）自行启用TUN/TAP。一般SolusVM都在这个位置。
![turn_on_tuntap.jpg](/images/2017/1087819567.jpg)
（ps，如果没有的话，建议发tk问问客服，让他们帮你开。。

## 获取tb-tun并编译

> TB-TUN is an tiny userspace program to build 6to4/tunnelbroker/ISATAP tunnel for Linux. The host kernel should have ipv6 stack and supports TUN/TAP. Generally the program should run with the root privilege.

以root用户直接运行以下命令

```shell
apt-get install iproute gcc git
cd /root
git clone https://github.com/acgrid/tb-tun.git
cd tb-tun
gcc tb_userspace.c -l pthread -o tb_userspace
mv tb_userspace /etc/
```

（简单解释下，安装依赖库，从github上获取源代码，编译，并将编译生成的tb_userspace移动到/etc目录下

## 创建自启动脚本

`nano /etc/init.d/ipv6tb`

然后将以下文本复制到文件中，记得将中括号中的内容换成你申请隧道后显示的信息，然后保存退出。

```shell
#! /bin/sh
 
### BEGIN INIT INFO
# Provides:          ipv6
# Required-Start:    $local_fs $all
# Required-Stop:     $local_fs $network
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: starts the ipv6 tunnel 
# Description:       ipv6 tunnel start-stop-daemon
### END INIT INFO
 
# /etc/init.d/ipv6tb
 
touch /var/lock/ipv6tb
 
case "$1" in
  start)
    echo "Starting ipv6tb "
      setsid /etc/tb_userspace tb [Server IPv4 Address] [Client IPv4 Address] sit > /dev/null 2>&1 &
      sleep 3s # ugly, but doesn't seem to work at startup otherwise
      ifconfig tb up
      ifconfig tb inet6 add [Routed /64] # Add as many of these as you need from your routed /64 allocation
      ifconfig tb mtu 1480
      route -A inet6 add ::/0 dev tb
      route -A inet6 del ::/0 dev venet0
    ;;
  stop)
    echo "Stopping ipv6tb"
      ifconfig tb down
      route -A inet6 del ::/0 dev tb
      killall tb_userspace
    ;;
  *)
    echo "Usage: /etc/init.d/ipv6tb {start|stop}"
    exit 1
    ;;
esac

exit 0
```

为该sh脚本添加可执行权限，以及自启动。
```shell
chmod 755 /etc/init.d/ipv6tb
update-rc.d ipv6tb defaults
```

手动启动
```shell
/etc/init.d/ipv6tb start
```

## 测试
VPS到国外国内延迟测试
```
root@keepservice:~# ping6 -c 5 www.goolge.com
PING www.goolge.com(ord38s04-in-x03.1e100.net) 56 data bytes
64 bytes from ord38s04-in-x03.1e100.net: icmp_seq=1 ttl=54 time=113 ms
64 bytes from ord38s04-in-x03.1e100.net: icmp_seq=2 ttl=54 time=113 ms
64 bytes from ord38s04-in-x03.1e100.net: icmp_seq=3 ttl=54 time=134 ms
64 bytes from ord38s04-in-x03.1e100.net: icmp_seq=4 ttl=54 time=113 ms
64 bytes from ord38s04-in-x03.1e100.net: icmp_seq=5 ttl=54 time=113 ms

--- www.goolge.com ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4003ms
rtt min/avg/max/mdev = 113.076/117.559/134.913/8.677 ms
root@keepservice:~# ping6 -c 5 bt.byr.cn
PING bt.byr.cn(2001:da8:215:4078:250:56ff:fe97:654d) 56 data bytes
64 bytes from 2001:da8:215:4078:250:56ff:fe97:654d: icmp_seq=1 ttl=51 time=219 ms
64 bytes from 2001:da8:215:4078:250:56ff:fe97:654d: icmp_seq=2 ttl=51 time=219 ms
64 bytes from 2001:da8:215:4078:250:56ff:fe97:654d: icmp_seq=3 ttl=51 time=219 ms
64 bytes from 2001:da8:215:4078:250:56ff:fe97:654d: icmp_seq=4 ttl=51 time=219 ms
64 bytes from 2001:da8:215:4078:250:56ff:fe97:654d: icmp_seq=5 ttl=51 time=265 ms

--- bt.byr.cn ping statistics ---
5 packets transmitted, 5 received, 0% packet loss, time 4004ms
rtt min/avg/max/mdev = 219.121/228.421/265.192/18.390 ms
```
国内教育网延迟测试
![ping_ipv6_tunnel_test.jpg](/images/2017/1376391526.jpg)
（似乎处于正常水平233333