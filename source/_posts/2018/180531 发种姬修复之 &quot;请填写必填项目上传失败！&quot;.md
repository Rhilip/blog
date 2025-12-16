---
title: 发种姬修复之 &quot;请填写必填项目上传失败！&quot;
date: 2018-05-31 13:46:35
categories: knowledge
tags: [Python,Autoseed,request]
permalink: /archives/913/
---

这个其实是一个一致很困扰的问题，虽然以前大体可以定位是因为python的requests库原因，导致file的filename属性在上传的时候不能正确的被编码，故服务器接收失败。但是之前这个并不是很影响发种姬发布（实际被影响的种子只有几个）。故一直没有去解决。

但最近在配置新的发种姬的时候，却发现所有种子、所有站点都出现了同样的错误。那么就说明了这个问题需要解决了23333

![error_log.jpg](/images/2018/05/2875412649.jpg)

额，如果你看不下去中间过程，请直接翻阅到最底下就行233333

<!--more-->

# 环境准备

## 构造demo站点

为了更明确的定位问题所在，建个demo站点。NexusPHP构架建立站点特别简单，唯一需要注意的是使用的PHP版本不能太高，因为np构架使用了高版本PHP版本抛弃的mysql方法库，所以我选择了`php 5.5.38`。

另，不建议使用Github上的某官方源码 [ZJUT/NexusPHP](https://github.com/ZJUT/NexusPHP) ，因为实测，这个版本引入了 [UCenter](https://github.com/ZJUT/NexusPHP/commit/a2df473c272ebd0da63455586d6dd63e2a267eaf) 但很明显没有完成（缺少相关的数据库构造语句）。更推荐使用SourceForge上的 [源码](https://sourceforge.net/projects/nexusphp/) 进行搭建。

![np_demo.jpg](/images/2018/05/1853803381.jpg)

搭建过程不是本文重点，你随便搜索个教程应该就能解决。~~（实际是这个demo站点很早之前就建好了，忘了当初是怎么建的了~~

## 服务器端takeupload.php

根据NP源码的`takeupload.php`分析，POST的body部分缺少descr、type、name、file字段时，会提示缺少必填项目，且字段缺少的情况在最开始的地方进行判断。且如果使用网页提交**空表单**的话，一般会进入后面的`std_empty_filename`（即提示信息为`文件名不能为空！ `）

相关参考代码（站点均可能对该部分源码进行修改）如下：

```php
foreach(explode(":","descr:type:name") as $v) {
	if (!isset($_POST[$v]))
	bark($lang_takeupload['std_missing_form_data']);
}
if (!isset($_FILES["file"]))
bark($lang_takeupload['std_missing_form_data']);
```

但这部分代码并不明确，故修改使之明确缺少信息。修改后的代码如下

```php
foreach(explode(":","descr:type:name") as $v) {
	if (!isset($_POST[$v]))
	bark('std_missing_form_data, which is'.$v);
}
if (!isset($_FILES["file"]))
bark('std_missing_form_data, which is file');
```

## 使用Fiddler4抓包

在服务器与客户端之间使用Fiddler代理抓包，代理信息为`127.0.0.1:8888`。

在requests中这样设置代理

```python
import requests

proxies = {
  "http": "http://127.0.0.1:8888",
  "https": "http://127.0.0.1:8888",
}

requests.get("http://example.org", proxies=proxies)
```

## 本地客户端临时Python脚本

首先更新本地的requests库到最新的`2.18.4`。（因为原先发种姬使用的`2.9.1`并没有出现很严重的问题）

并按照我们原先的发布方法新写一个基本的发布脚本。其源码如下：

```python
# ！/usr/bin/python3
# -*- coding: utf-8 -*-
# Copyright (c) 2017-2020 Rhilip <rhilipruan@gmail.com>

import requests
import os

from bs4 import BeautifulSoup
from utils.cookie import cookies_raw2jar

raw_cookies = "c_lang_folder=chs; c_secure_uid=MQ%3D%3D; c_secure_pass=0488b5e1d2441253cfd4c005ea3ce922; c_secure_ssl=bm9wZQ%3D%3D; c_secure_tracker_ssl=bm9wZQ%3D%3D; c_secure_login=bm9wZQ%3D%3D"
torrent_file = r"F:\[BYRBT].[VCB-Studio] Koi to Uso [Ma10p_1080p].torrent"
post_url = "http://nexusphp.localhost/takeupload.php"
proxies = {
  "http": "http://127.0.0.1:8888",
  "https": "http://127.0.0.1:8888",
}

tup = (
    ("file", (os.path.basename(torrent_file), open(torrent_file, 'rb'), 'application/x-bittorrent')),
    ("name", ('', "[BeanSub&FZSD][Saiki_Kusuo_no_Ψ-nan_S2][20][GB][720P][x264_AAC]")),
    ("small_descr", ('', "test file")),
    ("nfo", ('', "")),
    ("color", ('', "0")),
    ("font", ('', "0")),
    ("size", ('', "0")),
    ("descr", ('', "test file")),
    ("type", ('', "405")),
    ("medium_sel", ('', "5")),
    ("codec_sel", ('', "5")),
    ("standard_sel", ('', "5")),
    ("team_sel", ('', "5")),
)

r = requests.post(post_url,cookies=cookies_raw2jar(raw_cookies),files=tup,proxies=proxies)
if r.url != post_url:
    print(r.url)
else:
    outer_bs = BeautifulSoup(r.text, "lxml")
    outer_tag = outer_bs.find("td", id="outer")
    if outer_tag.find_all("table"):  # Remove unnecessary table info(include SMS,Report)
        for table in outer_tag.find_all("table"):
            table.extract()
    outer_message = outer_tag.get_text().replace("\n", "")
    print(outer_message)
```

# 试错

## 第一次尝试 （失败）  

运行前面刚写的临时Python脚本，我得到了一个很奇怪的报错。

```bash
D:\Anaconda3\python.exe E:/Github_repo/Byrbt-Autoseed/test.py
上传失败！std_missing_form_data, which is descr
```

很奇怪，丢失的信息是descr。通过Fiddler 4抓包信息可以看到，我们非文件的信息提交也被当做了文件提交，故PHP在使用$_POST从POST信息中获取参数时就获取不到正确的信息。

![first_try.jpg](/images/2018/05/2682303432.jpg)

修改服务器相关代码为下列后，重新运行脚本。

```php
foreach(explode(":","descr:type:name") as $v) {
	if (!isset($_POST[$v]))
	bark('std_missing_form_data from POST, which is '.$v.'.In FILES it\'s'.$_FILES[$v]);
}
```

得到以下返回

```bash
D:\Anaconda3\python.exe E:/Github_repo/Byrbt-Autoseed/test.py
上传失败！std_missing_form_data from POST, which is descr.In FILES it's Array
```

可见在requests(2.18.4)库中，我们原先使用的方法是存在问题的——所有非文件的会被`错误的`编码成文件。而导致服务器端程序不能正确获取值。

## 第二次尝试 （失败）

那么如果不能使用files的话，那使用data会怎么样？

修改脚本为下列后，重新运行脚本。

```python
r = requests.post(post_url,cookies=cookies_raw2jar(raw_cookies),data=tup,proxies=proxies)
```

得到以下返回

```python
D:\Anaconda3\python.exe E:/Github_repo/Byrbt-Autoseed/test.py
上传失败！std_missing_form_data, which is file
```

看来困扰之前的问题解决了。descr等字段已经被服务器正确的解析了。但file并没有，同时Fiddler抓包显示的信息表示上传的已经不是 `multipart/form-data ` 的形式。且file被错误的提交成了三个字段。

所以直接使用data属性也是不正确的举措。

![second_try.jpg](/images/2018/05/3400390566.jpg)

## 第三次尝试

如果这样的话，那么复用files和data会这么样那？我们继续修改Python脚本。

```python
file_tup = [
    ("file", (os.path.basename(torrent_file), open(torrent_file, 'rb'), 'application/x-bittorrent')),
]
other_data = {
    "name": "[VCB-Studio] Koi to Uso [Ma10p_1080p]",
    "small_descr":"test file",
    "nfo": "",
    "color": "0",
    "font": "0",
    "size": "0",
    "descr": "test file",
    "type":"405",
    "medium_sel": "5",
    "codec_sel": "5",
    "standard_sel":"3",
    "team_sel": "5",
}
r = requests.post(post_url,cookies=cookies_raw2jar(raw_cookies),
                  data=other_data,files=file_tup,
                  proxies=proxies)
```

这次很好，直接返回了我们想要的结果，同时Fiddler抓包也显示了正确的`requests body`。

```bash
D:\Anaconda3\python.exe E:/Github_repo/Byrbt-Autoseed/test.py
http://nexusphp.localhost/details.php?id=3&uploaded=1
```

![thir_try.jpg](/images/2018/05/3309858701.jpg)

## 第四次尝试 （失败）

我们重新回到requests提供的files属性上，通过查阅源代码备注，我们可以看到以下提示

```
files: (optional) Dictionary of ``'name': file-like-objects`` (or ``{'name': file-tuple}``) for multipart encoding upload.
        ``file-tuple`` can be a 2-tuple ``('filename', fileobj)``, 3-tuple ``('filename', fileobj, 'content_type')``
        or a 4-tuple ``('filename', fileobj, 'content_type', custom_headers)``, where ``'content-type'`` is a string
        defining the content type of the given file and ``custom_headers`` a dict-like object containing additional headers
        to add for the file.
```

那么是不是我们之前写的files元组出错了那？

```
tup1 = (
    ("file", (os.path.basename(torrent_file), open(torrent_file, 'rb'), 'application/x-bittorrent')),
    ("name", "[VCB-Studio] Koi to Uso [Ma10p_1080p]"),
    ("small_descr",  "test file"),
    ("nfo", ""),
    ("color",  "0"),
    ("font",  "0"),
    ("size","0"),
    ("descr", "test file"),
    ("type",  "405"),
    ("medium_sel", "5"),
    ("codec_sel", "5"),
    ("standard_sel","3"),
    ("team_sel", "5"),
)
r1 = requests.post(post_url,cookies=cookies_raw2jar(raw_cookies),files=tup1,proxies=proxies)

tup2 = {
    "file": (os.path.basename(torrent_file), open(torrent_file, 'rb'), 'application/x-bittorrent'),
    "name": "[VCB-Studio] Koi to Uso [Ma10p_1080p]",
    "small_descr": "test file",
    "nfo": "",
    "color": "0",
    "font": "0",
    "size": "0",
    "descr": "test file",
    "type": "405",
    "medium_sel": "5",
    "codec_sel": "5",
    "standard_sel": "3",
    "team_sel": "5",
}
r2 = requests.post(post_url,cookies=cookies_raw2jar(raw_cookies),files=tup2,proxies=proxies)
```

更改代码并分别运行，结果均显示`上传失败！std_missing_form_data from POST, which is descr.In FILES it's Array`。且Fiddler抓包结果与第一次尝试相同。

# 正确的发布脚本应该怎样

通过上面的尝试，我发现了在最新的requests库中，在files属性中的信息均会被编码成file而被发送，不与之前的编写时候的结果一致。其他非文件上传信息应该与文件信息分开放在data属性中。经过上面一步步试错，我们知道了正确的应该复用data与files（即**文件放在files中发，字段放在data中发**）才能正确的向服务器发送正确的信息。

```python
# ！/usr/bin/python3
# -*- coding: utf-8 -*-
# Copyright (c) 2017-2020 Rhilip <rhilipruan@gmail.com>

import requests
import os

from bs4 import BeautifulSoup
from utils.cookie import cookies_raw2jar

raw_cookies = "c_lang_folder=chs; c_secure_uid=MQ%3D%3D; c_secure_pass=0488b5e1d2441253cfd4c005ea3ce922; c_secure_ssl=bm9wZQ%3D%3D; c_secure_tracker_ssl=bm9wZQ%3D%3D; c_secure_login=bm9wZQ%3D%3D"
torrent_file = r"F:\[BYRBT].[VCB-Studio] Koi to Uso [Ma10p_1080p].torrent"
post_url = "http://nexusphp.localhost/takeupload.php"
proxies = {
    "http": "http://127.0.0.1:8888",
    "https": "http://127.0.0.1:8888",
}

file_tup = ("file", (os.path.basename(torrent_file), open(torrent_file, 'rb'), 'application/x-bittorrent')),
other_data = {
    "name": "[VCB-Studio] Koi to Uso [Ma10p_1080p]",
    "small_descr":"test file",
    "nfo": "",
    "color": "0",
    "font": "0",
    "size": "0",
    "descr": "test file",
    "type":"405",
    "medium_sel": "5",
    "codec_sel": "5",
    "standard_sel":"3",
    "team_sel": "5",
}

r = requests.post(post_url,cookies=cookies_raw2jar(raw_cookies),data=other_data,files=file_tup,proxies=proxies)
if r.url != post_url:
    print(r.url)
else:
    outer_bs = BeautifulSoup(r.text, "lxml")
    outer_tag = outer_bs.find("td", id="outer")
    if outer_tag.find_all("table"):  # Remove unnecessary table info(include SMS,Report)
        for table in outer_tag.find_all("table"):
            table.extract()
    outer_message = outer_tag.get_text().replace("\n", "")
    print(outer_message)
```

但这样还有问题没有解决。我们更改下种子文件。这样种子文件名中是带有特殊的，不能被ascii编码的字符。

```python
torrent_file = r"F:\[BYRBT].[BeanSub&FZSD][Saiki_Kusuo_no_Ψ-nan_S2][20][GB][720P][x264_AAC].mp4.torrent"
```

运行脚本，提示`上传失败！std_missing_form_data, which is file`，但Fiddler抓包结果显示正常，唯一不同的是filename那里显示的和正常的有些不同。

虽然暂时不是很明白是requests库的问题还是PHP处理的问题，（Ps. 我觉得是requests的问题可能更大些。。

![unasni_decode.jpg](/images/2018/05/349216546.jpg)

因为np的机制，上传后的种子名字在存储的时候以 `<tid>.torrent` 存储，而显示以及下载的时候是以做种时选择的文件夹以及文件名为主，所以移除影响不大。

所以你可以这么写233333

```
file_tup = ("file", ("rhilip.torrent", open(torrent_file, 'rb'), 'application/x-bittorrent')),
```

当然最好的还是用编码的形式先移除这些non-ascii的字符来使种子名正确的被requests库处理。

原理大体这样： `Python3: str -> bytes -> str` 

```python
>>>"[BYRBT].[BeanSub&FZSD][Saiki_Kusuo_no_Ψ-nan_S2][20][GB][720P][x264_AAC].mp4.torrent".encode("ascii", errors="ignore").decode()
'[BYRBT].[BeanSub&FZSD][Saiki_Kusuo_no_-nan_S2][20][GB][720P][x264_AAC].mp4.torrent'
```

重新修改，那么最终我们得到一个在requests(2.18.4)下，可以用的发布脚本，撒花*★,°*:.☆(￣▽￣)/$:*.°★* 。

```python
# ！/usr/bin/python3
# -*- coding: utf-8 -*-
# Copyright (c) 2017-2020 Rhilip <rhilipruan@gmail.com>

import requests
import os

from bs4 import BeautifulSoup
from utils.cookie import cookies_raw2jar

raw_cookies = "c_lang_folder=chs; c_secure_uid=MQ%3D%3D; c_secure_pass=0488b5e1d2441253cfd4c005ea3ce922; c_secure_ssl=bm9wZQ%3D%3D; c_secure_tracker_ssl=bm9wZQ%3D%3D; c_secure_login=bm9wZQ%3D%3D"
torrent_file = r"F:\[BYRBT].[BeanSub&FZSD][Saiki_Kusuo_no_Ψ-nan_S2][20][GB][720P][x264_AAC].mp4.torrent"
post_url = "http://nexusphp.localhost/takeupload.php"
proxies = {
    "http": "http://127.0.0.1:8888",
    "https": "http://127.0.0.1:8888",
}

file_name = os.path.basename(torrent_file).encode("ascii", errors="ignore").decode()
file_tup = ("file", (file_name, open(torrent_file, 'rb'), 'application/x-bittorrent')),
other_data = {
    "name": "[BeanSub&FZSD][Saiki_Kusuo_no_Ψ-nan_S2][20][GB][720P][x264_AAC]",
    "small_descr":"test file",
    "nfo": "",
    "color": "0",
    "font": "0",
    "size": "0",
    "descr": "test file",
    "type":"405",
    "medium_sel": "5",
    "codec_sel": "5",
    "standard_sel":"3",
    "team_sel": "5",
}

r = requests.post(post_url,cookies=cookies_raw2jar(raw_cookies),data=other_data,files=file_tup,proxies=proxies)
if r.url != post_url:
    print(r.url)
else:
    outer_bs = BeautifulSoup(r.text, "lxml")
    outer_tag = outer_bs.find("td", id="outer")
    if outer_tag.find_all("table"):
        for table in outer_tag.find_all("table"):
            table.extract()
    outer_message = outer_tag.get_text().replace("\n", "")
    print(outer_message)
```

