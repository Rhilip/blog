---
title: 基于Python的中国大学MOOC爬虫练手
date: 2017-01-16 23:04:00
categories:
 - [Coding, Python]
tags: 
 - MOOC
 - unicode
permalink: /archives/327/
---

项目地址：[Rhilip/icourse163-dl](https://github.com/Rhilip/icourse163-dl)


这个爬虫更新到v20170116([93ea55d4d215f675b8e2fae8003e19c03ceed0ad](https://github.com/Rhilip/icourse163-dl/blob/93ea55d4d215f675b8e2fae8003e19c03ceed0ad/icourse163-dl.py))这个版本，也算是差不多完成了吧。今后可能就不做更新了。

最早开始抓MOOC的时候，用的是插件的方法读视频的地址，如果没有记错的话，应该是Flash Video Downloader这个插件吧。当视频链接被读到后，就能插件被嗅探出来。早期发在byrbt的MOOC课程都是使用这种方法（因为那时候是为了自己平时使用方便临时抓的），按编号来说应该都在20之前滴说。

顺带那时候还没有发布MOOC的任何计划，就连教育网PT站点是什么都不知道QAQ。。。

然后很长时间我是用F12来读视频地址的。相比早期的插件法，可以很好的防止网易的垃圾服务器长时间无响应（也不知道是学校垃圾校园网的问题还是网易的问题。。。）。F12打开Chrome的开发者工具，在Network面板中用Filter过滤出来mp4。这种方法我大概抓了20-40门课。那时候感觉这真的是一件体力活。。。。

然后我开始动手写这个专门拿来抓中国大学MOOC下载链接的脚本了。。

不过自从大一学完了C语言后，基本就没写过程序（毕竟不是计算机专业2333）。还是遇到了很多的问题。比如如何解决登陆验证（后来用Session和Cookies绕过，带来的麻烦就是每隔一段时间就要更新）、比如如何清洗dwr交互文件的信息（后来直接用re来洗了）以及如何处理下载课程文档和字幕（脚本开源在github后多数commit都是和这个有关）等。

脚本的初稿（差不多就是 [611615d](https://github.com/Rhilip/icourse163-dl/commit/611615d785b9e2c5c0955441302d44227df0ca26) 这个样子）大概写了半天多吧，得益于我看文档理解运用的能力。。（一个没有用过Python来编程的孩子心里痛QAQ

可以看出来，文件还是有C的影子（哪怕现在也是2333，

另外，抓了这么多中国大学MOOC。不得不吐槽部分学校发布的课程简直不能看，命名还统一都是“课程视频”，真是呵呵了。

关于脚本，如果真要说的话，应该还没有完全完成吧。关于抓取说明和课程介绍的txt文件、课程的封面图和介绍视频等（写了一些后来弃坑了，引入bs4也就是为了这个）；抓取课程的时候统一只抓视频和文档，没有对章节进行处理（见下面的示例代码），造成了后期整理课程视频时候的麻烦。待他人fork后跟进吧，或者什么时候我又提起修改代码的兴趣（16年末一堆课程完结真是抓吐了我滴说）

```js
s19.chapterId=1002140025;s19.contentId=null;s19.contentType=1;s19.gmtCreate=1476768213802;s19.gmtModified=1476768213802;s19.id=1002445198;s19.isTestChecked=false;s19.name="1-2 \u8BA1\u7B97\u673A\u786C\u4EF6\u7CFB\u7EDF";s19.position=1;s19.releaseTime=1476768600000;s19.termId=1001877005;s19.test=null;s19.testDraftStatus=0;s19.units=s28;s19.viewStatus=0;
```

更多的是v20170116的脚本备份，建议访问github查看~
<!--more-->

```python
# -*- coding: utf-8 -*-
import requests, random, re, os
from bs4 import BeautifulSoup
from http.cookies import SimpleCookie
from urllib.parse import unquote

# -*- Config
# Warning:Before start ,You should fill in these forms.
# Course url (with key "tid")
course_url = ''
# Session
httpSessionId = ''
# cookies
raw_cookies = ''
# Post Header(Don't change)
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36',
    'Accept-Encoding': 'gzip, deflate',
    'Accept-Language': 'zh-CN,zh;q=0.8',
    'Content-Type': 'text/plain',
}

downloadSrt = True  # Download Chinese or English Srt (True or False)
downloadVideoType = ['mp4ShdUrl', 'mp4HdUrl', 'mp4SdUrl',
                     'flvShdUrl', 'flvHdUrl', 'flvSdUrl']  # Choose first video download link(if exists)

# -*- Api
# Arrange Cookies from raw
cookie = SimpleCookie()
cookie.load(raw_cookies)
cookies = {}
for key, morsel in cookie.items():
    cookies[key] = morsel.value


# getLessonUnitLearnVo (This funciton will return a dict with download info)
def getLessonUnitLearnVo(contentId, id, contentType):
    # prepare data and post
    payload = {
        'callCount': 1,
        'scriptSessionId': '${scriptSessionId}' + str(random.randint(0, 200)),
        'httpSessionId': httpSessionId,
        'c0-scriptName': 'CourseBean',
        'c0-methodName': 'getLessonUnitLearnVo',
        'c0-id': 1,
        'c0-param0': contentId,
        'c0-param1': contentType,
        'c0-param2': 0,
        'c0-param3': id,
        'batchId': random.randint(1000000000000, 20000000000000)
    }
    cs_url = 'http://www.icourse163.org/dwr/call/plaincall/CourseBean.getLessonUnitLearnVo.dwr'

    rdata = requests.post(cs_url, data=payload, headers=headers, cookies=cookies, timeout=None).text
    # print(rdata)
    info = {}  # info.clear()
    # Sort data depend on it's contentType into dict info
    if contentType == 1:  # Video
        info['videoImgUrl'] = str(re.search(r's\d+.videoImgUrl="(.+?)";', rdata).group(1))

        video_type = []    # Get Video download type
        for k in downloadVideoType:
            if re.search(r's\d+.'+ str(k) + '=".+?";', rdata):
                info[k] = str(re.search(r's\d+.'+ str(k) + r'="(.+?\.mp4).+?";', rdata).group(1))
                video_type.append(k)
        # type of resulting video
        info["videoType"] = video_type

        # Subtitle
        if re.search(r's\d+.name="\\u4E2D\\u6587";s\d+.url="(.+?)"', rdata):  # Chinese
            info['ChsSrt'] = str(re.search(r's\d+.name="\\u4E2D\\u6587";s\d+.url="(.+?)"', rdata).group(1))
        if re.search(r's\d+.name="\\u82F1\\u6587";s\d+.url="(.+?)"', rdata):  # English
            info['EngSrt'] = str(re.search(r's\d+.name="\\u82F1\\u6587";s\d+.url="(.+?)"', rdata).group(1))

    # if contentType == 2: # Test
    if contentType == 3:  # Documentation
        info['textOrigUrl'] = str(re.search(r'textOrigUrl:"(.+?)"', rdata).group(1))
    # if contentType == 4:  # Rich text
    # if contentType == 5:  # Examination
    # if contentType == 6:  # Discussion

    # print(info)
    return info


# Structure lesson(This funciton will return a dict with lesson info)
def sort_lesson(index):
    return dict(
        contentType=int(re.search(r'.contentType=(\d+);', index).group(1)),
        name=str(re.search(r'.name="(.+)";', index).group(1))
            .replace(r'\n', '')
            .encode('utf-8').decode('unicode_escape')
            .encode('gbk', 'ignore').decode('gbk', 'ignore')
            .replace('/', '_').replace(':', '：').replace('"', ''),
        info=getLessonUnitLearnVo(re.search(r'.contentId=(\d+);', index).group(1),
                                  re.search(r'.id=(\d+);', index).group(1),
                                  int(re.search(r'.contentType=(\d+);', index).group(1))),
    )


# Download things
def downloadCourseware(path, link, filename):
    if not os.path.exists(path):
        os.makedirs(path)
    r = requests.get(link)
    with open(path + "\\" + filename, "wb") as code:
        code.write(r.content)
        print("Download \"" + filename + "\" OK!")


# -*- End of Api

# -*- Main
def main():
    # handle the course_url links to Get right courseId and termId
    if not re.search(r'([A-Za-z]*-\d*)', course_url):
        print("No course Id,Please check!")
        return
    else:
        courseId = re.search(r'([A-Za-z]*-\d*)', course_url).group(1)
        bs = BeautifulSoup(requests.get(url="http://www.icourse163.org/course/" + courseId + "#/info", timeout=None).text, "lxml")
        course_info_raw = bs.find("script", text=re.compile(r"termDto")).string
        if re.search(r'tid', course_url):
            tid = re.search(r'tid=(\d+)', course_url).group(1)
        else:
            print("No termId which you want to download.Will Choose the Lastest term.")
            tid = re.search(r"termId : \"(\d+)\"", course_info_raw).group(1)

        print('Begin~')
        # Generate Grab information
        course_name = re.search(r'(.+?)_(.+?)_(.+?)', bs.title.string).group(1)
        school_name = re.search(r'(.+?)_(.+?)_(.+?)', bs.title.string).group(2)
        teacher_name = []
        for i in bs.find_all('h3', class_="f-fc3"):
            teacher_name.append(i.string)
            if len(teacher_name) &gt;= 3:
                teacher_name[2] += '等'
                break
        teacher_name = '、'.join(teacher_name)
        path = course_name + '-' + school_name + '-' + teacher_name
        print("The Download INFO:\nCourse:" + path + "\nid: " + courseId + "\ntermID:" + tid)

        # Make course's dir
        if not os.path.exists(path):
            os.makedirs(path)

        # Get course's chapter
        cont = [0, 0]  # count
        payload = {
            'callCount': 1,
            'scriptSessionId': '${scriptSessionId}' + str(random.randint(0, 200)),
            'httpSessionId': httpSessionId,
            'c0-scriptName': 'CourseBean',
            'c0-methodName': 'getLastLearnedMocTermDto',
            'c0-id': 0,
            'c0-param0': tid,
            'batchId': random.randint(1000000000000, 20000000000000)
        }
        cs_url = 'http://www.icourse163.org/dwr/call/plaincall/CourseBean.getLastLearnedMocTermDto.dwr'
        rdata = requests.post(cs_url, data=payload, headers=headers, cookies=cookies, timeout=None).text
        # print(rdata)
        if re.search(r'var s\d+=\{\}', rdata):
            rdata = rdata.splitlines()  # str -&gt; list
            # Data cleaning
            for index in rdata:
                # Structure lesson
                if re.match(r's(\d+).anchorQuestions=', index):
                    lesson = sort_lesson(index)
                    lessontype = lesson['contentType']
                    if lessontype == 1:  # Video
                        bestvideo = lesson['info'].get('videoType')  # Choose download video Type
                        # Output video download link
                        dllink = lesson['info'].get(bestvideo[0])
                        open(path + "\\dllink.txt", "a").write(dllink + "\n")
                        # Output video rename command
                        dlfile = re.search(r'/(\d+?_.+?\.(mp4|flv))', dllink).group(1)
                        videotype = re.search(r'^(flv|mp4)(Sd|Hd|Shd)Url', str(bestvideo[0]))
                        if str(videotype.group(2)) == "Shd":
                            new = "ren " + dlfile + " \"" + str(lesson.get('name')) + "." + str(
                                videotype.group(1)) + "\"\n"
                        else:
                            new = "ren " + dlfile + " \"" + str(lesson.get('name')) + "_" + str(
                                videotype.group(2)) + "." + str(videotype.group(1)) + "\"\n"
                        print("Find Video\n" + str(lesson.get('name')) + " : "+ dllink)
                        open(path + "\\ren.bat", "a").write(new)
                        cont[0] += 1
                        # Subtitle
                        if downloadSrt:
                            if lesson['info'].get('ChsSrt'):
                                print("Find Chinese Subtitle for this lesson,Begin download.")
                                downloadCourseware(path=path + "\\" + "srt",
                                                   link=str(lesson['info'].get('ChsSrt')),
                                                   filename=str(lesson.get('name')) + '.chs.srt')

                            if lesson['info'].get('EngSrt'):
                                print("Find English Subtitle for this lesson,Begin download.")
                                downloadCourseware(path=path + "\\" + "srt",
                                                   link=str(lesson['info'].get('EngSrt')),
                                                   filename=str(lesson.get('name')) + '.eng.srt')

                    if lessontype == 3:  # Documentation
                        wdlink = lesson['info'].get('textOrigUrl')
                        # print(wdlink)
                        print("Find Document,Begin download.")
                        downloadCourseware(path=path + "\\" + "docs",
                                           link=wdlink,
                                           filename=str(cont[1]) + " " + 
                                           unquote(re.search(r'&amp;download=(.+)', wdlink).group(1)).replace("+", " "))
                        cont[1] += 1
            print("Found {0} Video(es),and {1} Text(s) on this page".format(cont[0], cont[1]))
        else:
            print("Error:" + re.search(r'message:(.+)\}\)', rdata).group(
                1) + ",Please make sure you login by 163-email and your \"Session-Cookies\" pair is right.")

if __name__ == '__main__':
    main()

```
