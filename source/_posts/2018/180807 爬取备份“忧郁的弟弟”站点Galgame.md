---
title: 爬取备份“忧郁的弟弟”站点Galgame
date: 2018-08-07 09:20:00
categories: python
tags: [Python,sqlite3,mygalgame]
permalink: /archives/995/
---

[我的Galgame资源发布站 - 忧郁的弟弟](https://www.mygalgame.com/) 是由忧郁的弟弟提供的汉化Galgame下载站点，关于该站点介绍请访问：[关于若干注意事项（新人必读） | 我的Galgame资源发布站](https://www.mygalgame.com/guanyuruoganzhuyishixiangxinrenbidu.html)

> 资源备份档分享请见：[Mygalgame全站资源备份](https://archive.rhilip.info/ACGN/Galgame/Mygalgame%E5%85%A8%E7%AB%99%E8%B5%84%E6%BA%90%E5%A4%87%E4%BB%BD.md)
> 他人抓取项目请见： [Mygalgame backup](https://beats0.github.io/www.mygalgame.com/)

弟弟站点html结构十分规范，而且爬取特别容易。问题在于该站的资源都是用百度云进行存储，而百度云的转存与下载较为麻烦。这里我们采取抓取和转存分别进行的方法，构造备份站点。步骤如下：

1. 对弟弟站所有页面进行抓取下载并存储。
2. 进行百度云批量转存，使用BaiduPCS-GO进行下载操作。
3. 使用rclone转存到GDrive以及OneDrive。
4. 使用OneIndex进行展示~

> 关于“忧郁的弟弟”站点备份，Github已有类似项目，具体可参见：[Beats0/www.mygalgame.com](https://github.com/Beats0/www.mygalgame.com)

## 站点爬取

目前弟弟站的百度云链接需要使用post的方式二次获取，故在获取到文章链接后，构造post表单进行获取。方法如下：

```python
import re
import time
import sqlite3
import requests
from bs4 import BeautifulSoup

s = requests.Session()
s.cookies.update({"switchtheme":"mygalgame2"})
s.headers.update({"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36"})

db = sqlite3.connect(r"f:/mygalgame.db")
cur = db.cursor()

cur.execute("CREATE TABLE mygalgame ("+
    "raw_link   VARCHAR (255),"+
    "name       VARCHAR (100),"+
    "baidu_link VARCHAR (255),"+
    "secret_key VARCHAR (4)   UNIQUE PRIMARY KEY,"+
    "descr      TEXT"+
");"
)

for p in range(1,84):
    page = s.get("https://www.mygalgame.com/page/{}/".format(p))
    page = BeautifulSoup(page.text,"lxml")
    a_list = page.select("div#article-list > div > section > div.title-article > h1 > a")
    article_list = list(map(lambda x:x["href"], a_list))
    print("Craw Page {}, and find {} links".format(p,len(article_list)))
    for a in article_list:
        page_1 = s.get(a)
        if re.search("A\d{3}",page_1.text):
            secret_key = re.search("A\d{3}",page_1.text).group(0)
            page_2 = s.post(a,data={"e_secret_key":secret_key})
            page_bs = BeautifulSoup(page_2.text,"lxml")
            name_ = page_bs.select_one("div.title-article a").get_text()
            baidu_link = re.search("go\.php\?url=(https?://pan.baidu.com/s/[^']+)'",page_2.text).group(1)
            descr = str(page_bs.select_one("div.centent-article"))
            descr = descr[:descr.find("<!-- 内容主体结束 -->")]
            cur.execute("INSERT INTO `mygalgame` (`raw_link`, `name`, `baidu_link`, `secret_key`, `descr`) VALUES (?,?,?,?,?)",(a,name_,baidu_link,secret_key,descr))
            print("{}: {} OK~".format(secret_key,a))
            db.commit()
        time.sleep(5)
    print("Page {} Over~".format(p))
    time.sleep(5)
```

经过上述爬取，仍发现几项缺失，具体列在下表：

| 缺失项 | 可能的名称                                                  | 备注                                                         |
| ------ | ----------------------------------------------------------- | ------------------------------------------------------------ |
| A345   | ***资源吃饭                                                 | 没找到~                                                      |
| A457   | 下级生2                                                     | 与下级生1（A456）同一页面                                    |
| A458   | 恋×シンアイ彼女 体験版                                      | 正式版见[A584](https://www.mygalgame.com/xiangyaochuandageinideailian.html) |
| A516   | オトメ＊ドメイン 体験版                                     | 参见他人备份补齐                                             |
| A574   | [千恋＊万花](https://www.mygalgame.com/qianlianwanhua.html) | 手动补齐                                                     |

## 百度云转存下载

使用Selenium半自动登陆并转存。代码如下，前半部分登陆手动完成，后面分享转存交由程序进行。

```python
from selenium import webdriver
from selenium.webdriver.common.keys import Keys

browser = webdriver.Chrome(r"d:\chromedriver.exe")
browser.get("https://pan.baidu.com")  # 用户登陆（手动）

uk_list = cur.execute("SELECT baidu_link,secret_key from mygalgame order by secret_key asc").fetchall()
for url,key in uk_list:
    try:
        browser.get(url)   # 打开分享链接
        browser.implicitly_wait(3)   # 等待3秒
        browser.find_element_by_tag_name("input").send_keys(key,Keys.ENTER)  # 输入分享密码并回车
        browser.implicitly_wait(5)
        browser.find_element_by_xpath('//*[@id="shareqr"]/div[2]/div[2]/div/ul[1]/li[1]/div/span[1]').click()  # 全选分享文件
        browser.find_element_by_xpath('//*[@id="bd-main"]/div/div[1]/div/div[2]/div/div/div[2]/a[1]/span/span').click()  # 点击转存按钮
        browser.implicitly_wait(2)
        browser.find_element_by_xpath('//*[@id="fileTreeDialog"]/div[3]').click()  # 勾选上次保存位置
        browser.implicitly_wait(2)
        browser.find_element_by_xpath('//*[@id="fileTreeDialog"]/div[4]/a[2]/span').click()  # 点击确认按钮
        browser.implicitly_wait(2)
        print("Transfer {}#{} Success~".format(url,key))
    except Exception:
        print("Transfer {}#{} Fail!!!!".format(url,key))
```

![TIM截图20180806131047.jpg](/images/2018/08/1217328313.jpg)

注意：

- 估算每个Gal的体积为2G，故1T百度云盘约能转存500左右游戏。
- 请使用开发者工具block掉一些请求，以防止页面长时间等待加快速度。例如：

![TIM截图20180806113155.jpg](/images/2018/08/1001885792.jpg)

而下载使用 [BaiduPCS-GO](https://github.com/iikira/BaiduPCS-Go)。使用前面获取的BUDSS进行登陆，并使用screen挂在后台进行下载即可。（然而使用国外服务器下载还是很慢23333）

## 简介清洗

因为OneIndex能展示`READMD.md`，所以将原有html格式简介清洗为markdown格式的文件，示例格式如下：

```python
import subprocess
import sqlite3
import re

from markdownify import markdownify as md
from bs4 import BeautifulSoup

process = subprocess.Popen(['rclone','lsd','GDrive:/galgame'], stdout=subprocess.PIPE)
output, _  =process.communicate()

output = str(output,"utf-8")

outlist = output.splitlines()

db = sqlite3.connect(r"f:/mygalgame.db")
cur = db.cursor()

temple = """
# {name}

> 来源于： [{source_link}]({source_link})

## 游戏截图

{img_list}

## 游戏简介

{introduce}

## 汉化STAFF

{staff}


## 文件信息

备注： {beizhu}

{note}

标签： {tag}
"""


for i in outlist:
    oid = re.search("A\d{3}",i).group(0)

    print("开始处理{}".format(i))

    sourcename = re.search("A\d{3}.*?$",i).group(0)

    fetch_ = cur.execute("SELECT * FROM mygalgame where secret_key = ? ",[oid])
    link,name,bdlink,key,descr,_ = fetch_.fetchone()

    de_bs = BeautifulSoup(descr,"lxml")
    img_list = de_bs.find_all("img")
    img_md = "\n".join(map(lambda x:"![]({})".format(x["src"]),img_list))

    introduce = staff = beizhu  = tag =  ""

    main_part = de_bs.find_all("div",class_="alert-success")

    if len(main_part) == 1:
        i_tag = main_part[0]
        introduce = md(str(i_tag))
    elif len(main_part) > 1:
        i_tag,s_tag = main_part[:2]
        staff = md(str(s_tag))
        introduce = md(str(i_tag))

    beizhu_search = re.search('备注：<span style="color: #ff0000;">(.+?)</span>',descr)
    if beizhu_search:
        beizhu = beizhu_search.group(1)

    tag_list_raw = de_bs.find_all("a",rel="tag")
    if len(tag_list_raw) > 0:
        tag_list = map(lambda x:x.get_text(strip=True),tag_list_raw)
        tag = ", ".join(tag_list)


    note = md(str(de_bs.find("div",class_="alert-info"))).replace("任何解压相关问题请看网站顶部解压必读，不看而发问直接小黑屋","").strip()

    md_data = temple.format(name=name,source_link=link,img_list=img_md,introduce=introduce.replace("\n","\n\n"),
    staff=staff.replace("\n","\n\n"),note=note.replace("\n","\n\n"),beizhu=beizhu,tag=tag)
    print("生成的Markdown格式如下",md_data)

    with open(r"F:\Temp\README.md","w",encoding="utf-8") as f:
        f.write(md_data)
        print("写入临时文件完成")

    process = subprocess.Popen(['rclone','copy',r"F:\Temp\README.md",'GDrive:/galgame/{}'.format(sourcename)], stdout=subprocess.PIPE)
    process.communicate()
    print("上传 README.md 完成")

    dstname = "{}@{}".format(key,name)
    process = subprocess.Popen(['rclone','moveto','GDrive:/galgame/{}'.format(sourcename),'GDrive:/mygalgame/{}'.format(dstname)], stdout=subprocess.PIPE)
    process.communicate()
    print("文件夹 重命名+移动 完成")
```

## OneIndex建站

随意找一个微软5T的盘，绑定OneIndex进行展示，使用rclone将Google Drive上面的文件夹完全转发。

