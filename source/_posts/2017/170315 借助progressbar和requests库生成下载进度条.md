---
title: 借助progressbar和requests库生成下载进度条
date: 2017-03-15 00:00:00
categories:
 - [Coding, Python]
tags: 
 - MOOC
 - progressbar
permalink: /archives/388/
---

用到的库安装方法：pip install progressbar2 requests

```python
import progressbar
import requests

url = "http://nos.netease.com/edu-lesson-pdfsrc/A8F0571EBA54AD8FD950686D36B77431-1453125582371?NOSAccessKeyId=7ba71f968e4340f1ab476ecb300190fa&Expires=1490372730&Signature=xK3mtF3jF4nP%2BaxzzRzTAwpSC2ClolhGa9%2BwXJ%2BIwlQ%3D&download=ch01-1a.pdf"
filename = r"test.pdf"

# Session
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.8',
    'Connection': 'keep-alive',
    # 'Content-Type': 'text/plain',
}
session = requests.Session()
session.headers.update(headers)

response = session.get(url, stream=True, data=None, headers=None)

total_length = int(response.headers['content-length'])
with open(filename, "wb") as f:
    chunk_size = 102400
    widgets = ["Progress: ", progressbar.Percentage(), " ",
               progressbar.Bar(marker="&gt;", left="[", right="]"),
               " ", progressbar.ETA(), " ", progressbar.FileTransferSpeed()]
    pbar = progressbar.ProgressBar(widgets=widgets, maxval=total_length).start()
    length = 0
    for chunk in response.iter_content(chunk_size=chunk_size):
        if chunk:
            f.write(chunk)
            f.flush()
        length += len(chunk)
        pbar.update(length)
    pbar.finish()
```