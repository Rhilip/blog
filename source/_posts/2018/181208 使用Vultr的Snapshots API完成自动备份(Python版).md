---
title: 使用Vultr的Snapshots API完成自动备份(Python版)
date: 2018-12-08 14:04:00
categories: knowledge
tags: [Python,vultr,snapshot]
permalink: /archives/1040/
---

除了免费赠送可挂载的50G Block Storage之外，Snapshots可能也是吸引我使用[Vultr](https://www.vultr.com/?ref=7603581)的原因。虽然我一直没有从快照中还原过2333（但是好歹有个心理安慰是不是）

> 注意，默认情况下最多创建11个Snapshots！！！！

可能是因为本人搜索姿势不对吧，使用“vultr snapshot script”在Google中只搜索到 [Automated Snapshots](https://gist.github.com/mcknco/cbf337e00479a20b2df11e7601d60207) 这一个使用PHP写的脚本。但是为了系统安全，我在`php.ini`中禁用了“shell_exec”等方法。同时，该PHP脚本只能在Vultr主机上运行且只对当前机器进行备份。

所以自己模仿着这个脚本写了一下Python3的版本，全部脚本如下，你也可以到Gist上查阅：[Rhilip/**vultr-snapshot**](https://gist.github.com/Rhilip/8c7b8579ac115f84a5ede70f83ad69d2)


```python
import re
import time
import datetime
import requests

# -------------用户设置 开始-------------- #

# 填写Vultr的API KEY
API_KEY = ""

# 请填写服务器主IP地址或者SUBID，（二选一即可）
MAIN_IP = "1.2.3.4"
SUBID = None

BACKUP_TAG_PREFIX = "auto_backup"  # 备份头
MAX_NUM_OF_BACKUPS = 3  # 最大备份数

# -------------用户设置 结束-------------- #

# Get base info
api_endpoint = "https://api.vultr.com/v1/"
day = time.strftime("%Y-%m-%d", time.localtime()) 


# simple wrapper to access vultr api
def vultr(method = "GET",action = "" , data = None):
    return requests.request(method,"{}{}".format(api_endpoint,action),headers = {"API-Key" : API_KEY}, data=data)


server_list = vultr("GET","server/list").json()

# Find subid if not set.
if SUBID == None:
    for server_subid,server_info in server_list.items():
        if server_info.get("main_ip", None) == MAIN_IP:
            SUBID = server_subid
            break

    if SUBID == None:
        raise Exception("Fail to find subid for IP: {}".format(MAIN_IP))

snapshot_list_raw = vultr("GET","snapshot/list").json()

# Resort the raw snapshot list dict to list obj
snapshot_list = [v for k,v in snapshot_list_raw.items()]

# Get auto-backup snapshot list
backup_snapshot_list = list(filter(lambda x:re.search("{}-{}".format(BACKUP_TAG_PREFIX,SUBID),x["description"]),snapshot_list))

# Remove old auto-backup-snapshot
if len(backup_snapshot_list) >= MAX_NUM_OF_BACKUPS:
    to_remove_snapshot_list = sorted(backup_snapshot_list,
    key = lambda k:datetime.datetime.strptime(k["date_created"],"%Y-%m-%d %H:%M:%S")
    )[:-MAX_NUM_OF_BACKUPS]
    
    for s in to_remove_snapshot_list:
        vultr("POST","snapshot/destroy",{"SNAPSHOTID": s["SNAPSHOTID"]})

# create New auto-backup-snapshot
vultr("POST","snapshot/create",{"SUBID": SUBID,"description": "{}-{}-{}".format(BACKUP_TAG_PREFIX,SUBID,day)})
```

## 完整食用方法如下

<!--more-->

1. 到`Account->API`上申请API TOKEN并在下方`Access Control`中添加允许访问的主机，一般来说，如果你申请了VPS的IPv6地址，可以添加该IPv6地址。
    ![TIM截图20181104151706.png](/images/2018/12/3608276957.png)

2. 在主机上安装python3以及使用pip安装requests库。

	```bash
	apt install python3 python3-pip
	pip3 install requests
	```

3. 创建脚本并修改用户设置项。其中`MAIN_IP`与`SUBID`只需要写一个就行，（SUBID优先使用，当SUBID未提供的使用使用MAIN_IP从Vultr API中获取）
4. 测试运行并检查有没有出错，如果运行成功，应该可以看到一个Snapshot正在创建

	```bash
	python3 /home/user/scripts/vultr_auto_snapshot.py
	```

5. 使用Crontab定时运行（每天0点）

	```crontab
	0 0 * * * /usr/bin/python3 /home/user/scripts/vultr_auto_snapshot.py
	```

![TIM截图20181208220134.png](/images/2018/12/2992400786.png)