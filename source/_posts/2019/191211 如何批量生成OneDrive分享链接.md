---
title: 如何批量生成OneDrive分享链接
date: 2019-12-11 14:43:00
categories: knowledge
tags: [rclone,onedrive]
permalink: /archives/1173/
---

~~这篇文章其实早就想写了，然而一直放在自己的ToDO list里面，就那么一直放着放着（还有几篇是一样的命运，就开了个头）。然后一看自己快两个月没更新blog了，随便写点上来分享下。~~

在很早很早之前，我使用过OneIndex以及它的一系列衍生开源项目分享过文件。然而就如同我在 `个人仓库` 的说明中写的那样，这一系列的开源项目存在一些很麻烦的问题，我之后便开始使用ShareLink的形式创建分享链接的形式来进行分享。

# 最开始

当然，最早之前，我是用网页端生成共享链接的方式来进行的，然后随便找个短链接生成网站生成个短链接就行。这个方式怎么说那，虽然原始但是可用23333，毕竟文件量少，简单操作下不需要多少时间。

![image-20191211212443500.png](/images/2019/12/387359422.png)

# 使用rclone link

再后来，我在使用rclone的时候意外发现了`rclone link`的方法，根据他的介绍，会生成约束最少（没有过期时间，没有密码保护，无需账户匿名即可访问）的链接，也刚好是我需要的链接类型。

![image-20191211213709829.png](/images/2019/12/3946179966.png)

这个很棒，从此可以很方便的调用rclone并通过获得输出的形式来获得分享链接。

简单的脚本实例如下：

```python
import subprocess

file_path = "OndDrive:archive"
response = subprocess.check_output('rclone link ' + file_path, shell=True)
share_link = response.decode('utf-8')
```

通过配合rclone lsjson方法，我们可以快速遍历文件夹，甚至为每一个文件或者文件夹创建链接。

```python
import os
import subprocess

def create_share_link(path): str
    response = subprocess.check_output('rclone link ' + path, shell=True)
	share_link = response.decode('utf-8')
    return share_link

def create_short_link(raw): str
    pass

def get_folder_items(path):
    response = subprocess.check_output('rclone lsjson ' + path, shell=True)
	return json.loads(response.decode('utf-8'))

def folder_loop(base):
    # 当前目录信息
    par_path = os.path.dirname(base)
    fpath = os.path.basename(base)
    folder_items = get_folder_info(base)

    # 先进行子文件夹循环
    item_subfolders = list(filter(lambda x: x.get('IsDir') == True, folder_items))
    for subfloder in item_subfolders:
        subfolder_loop(os.path.join(base, subfloder.get('Path')))

    # 其他文件
    items = list(filter(lambda x:x not in item_subfolders, folder_items))
    for item in items:
        full_path = os.path.join(base, item.get('Path'))
        share_link = create_share_link(full_path)
        short_link = create_short_link(share_link)
        print(full_path, share_link, short_link)
        
base = "OneDrive:archive"
folder_loop(base)
```

# 直接使用python创建

那么如果抛开，或者半抛开rclone（仅refresh仍使用rclone）是否可行？毕竟我们有时候还需要构建其他类型的分享链接。

结论当然是可行的！~~（不然就没这篇文章了）~~

> 官方文档 ： [Access OneDrive and SharePoint via Microsoft Graph API - OneDrive dev center | Microsoft Docs](https://docs.microsoft.com/en-us/onedrive/developer/rest-api/?view=odsp-graph-online)

根据  [文档](https://docs.microsoft.com/en-us/onedrive/developer/rest-api/api/driveitem_createlink?view=odsp-graph-online) 说明，创建链接只需要一个简单的POST请求即可，请求地址如下

```
POST /drives/{driveId}/items/{itemId}/createLink
POST /groups/{groupId}/drive/items/{itemId}/createLink
POST /me/drive/items/{itemId}/createLink
POST /sites/{siteId}/drive/items/{itemId}/createLink
POST /users/{userId}/drive/items/{itemId}/createLink
```

而请求的主体部分是一个json字典，通过更改type和scope，我们就可以设定分享链接的类型（注意你所在域的设置），如下

```json
{
  "type": "view",
  "scope": "anonymous"
}
```

而请求的返回则同样是一个json字典，我们最需要的生成分享链接在 `["link"]["webUrl"]` 中

```json
{
  "id": "123ABC",
  "roles": ["write"],
  "link": {
    "type": "view",
    "scope": "anonymous",
    "webUrl": "https://1drv.ms/A6913278E564460AA616C71B28AD6EB6",
    "application": {
      "id": "1234",
      "displayName": "Sample Application"
    },
  }
}
```

这样我们就只需要知道itemId，就可以通过构造http请求来获得分享链接了，构造的代码段如下

>  **请注意，此处及之后的示例代码均没有考虑token过期，返回错误导致所需字段不存在的异常情况，实际上token有效期只有1小时，如果文件数过多容易过期失效，而且MS的服务器也很容易返回非token过期的其他异常情况**

```python
def share_by_id(id_):
    share_req = requests.post('https://graph.microsoft.com/v1.0/me/drive/items/{}/createLink'.format(
        id_), headers={'Authorization': 'bearer ' + token}, json={'type': 'view', 'scope': 'anonymous'})
    return share_req.json()['link']['webUrl']
```

最关键的解决了，我们需要开始知道itemId如何获取，方法也十分简单，通过请求对应文件上层目录就可以获得其children信息，其中就有包括itemId的数据。同样根目录也有对应的请求方法。

简单构造分享两级目录的代码段如下：

```python
# 获得driveid
did = requests.get('https://graph.microsoft.com/v1.0/me/drives', headers={'Authorization': 'bearer ' + token}).json()['value'][0]['id']

# 列出根目录
root = requests.get('https://graph.microsoft.com/v1.0/me/drive/root/children', headers={'Authorization': 'bearer ' + token}).json()

for folder in root['value']:
    folder_id = folder['id']
    # 列某id下的目录信息
    folder_req = requests.get('https://graph.microsoft.com/v1.0/drives/{}/items/{}/children'.format(did, folder_id), headers={'Authorization': 'bearer ' + token})
	folder_ = folder_req.json()
    for item in folder_['value']:
        id_ = item_['id']
        name_ = item_['name']
        
        # 创建分享链接
        share_link = share_by_id(id_)
        print('获得 {} 的分享链接 {}' .format(name_, share_link))
        
```

driveid通过解析rclone的`rclone.conf`文件进行获取。此外，如果你自己重申请（refresh） token存在困难~~（就比如我）~~，refresh token也可以交给rclone来进行。例如：

```python
import json
import subprocess
import configparser

did = 'adfasdfas'
token = 'adfasdfasdf'

rclone_config_path = '~/.config/rclone/rclone.conf'

subprocess.run('rclone about OneDirve:', shell=True)

config = configparser.ConfigParser()
config.read(rclone_config_path)

did = config['OneDrive']['drive_id']
raw_token = json.loads(config['OneDrive']['token'])

token = raw_token['access_token']
```

> 2019.12.19更新：

因为OneDrive一次只返回200个子目录结果，所以我们需要对进入创建sharelink之前，通过递归的方式获得所有items，基本代码段如下：
```python

def get_items(link):
    f = requests.get(link, headers={'Authorization': 'bearer ' + token})
    fj = f.json()
    v = fj['value']

    if fj.get('@odata.nextLink'):
        v.extend(get_items(fj['@odata.nextLink']))

    return v

all_items = get_items('https://graph.microsoft.com/v1.0/drives/{}/items/{}/children'.format(did, folder_id))
for item in all_itmes:
    id_ = item_['id']
    share_link = share_by_id(id_)
```


没有了，基本代码就这些，基于这些代码，我是怎么玩的，以及怎么处理异常的就不具体贴出来了~