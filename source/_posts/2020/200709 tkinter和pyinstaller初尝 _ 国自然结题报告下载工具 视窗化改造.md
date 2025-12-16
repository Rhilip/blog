---
title: tkinter和pyinstaller初尝 ： 国自然结题报告下载工具 视窗化改造
date: 2020-07-09 15:01:23
categories: python
tags: [Python,nsfc,nsfc_conclusion_downloader,tkinter,pyinstaller,gui]
permalink: /archives/1242/
---

我在今年2月的时候写了个 [Rhilip/NSFC_conclusion_downloader](https://github.com/Rhilip/NSFC_conclusion_downloader) 来辅助我从[科学基金共享服务网（科技成果信息系统）](http://output.nsfc.gov.cn/) 下载 国自然结题报告，并生成PDF文件。截至目前也有了12个star，并且在知乎上介绍之后，也开始有其他使用的人。

可毕竟原项目需要一定的python基础（基础到极限了），但使用人（包括我们课题组的同学）多数并不具备编程基础，导致原脚本形式的repo难以被使用。

![image-20200709175406546.png](/images/2020/07/260091084.png)

这段时间真好稍空，翻看“知乎”的时候正好看见[别人的抱怨](https://www.zhihu.com/question/58311059/answer/997750386)。便想着将其写一个GUI出来，方便其他人的使用。

最终形成的软件截图如下：

![gui_usage.png](/images/2020/07/1960454922.png)

你可以在 [Release页面](https://github.com/Rhilip/NSFC_conclusion_downloader/releases) 直接下载，然后解压后直接可以打开使用。

![image-20200709213546323.png](/images/2020/07/1112991390.png)

！！！后面的，对tkinter和pyinstaller等具体编写过程不感兴趣的可以不用看了！！！



# GUI框架编写调查

因为之前写各类脚本的时候并没有考虑过可视化（虽然html写过很多），所以这次对python的gui编程也进行了一定的资料收集。

首先是GUI框架的选取，Python中有名的GUI框架就tkinter和PyQT5。因为本项目是一个小项目，而且也可以算是本人GUI编写入门。经过简单到不能再简单的抉择，选择tkinter作为GUI框架，一方面是因为这个库入手较为简单，很适合作为Python的GUI编写入门，另一方面是因为tkinter是Python的内置库，不需要像PtQt5一样，安装Qt5环境，这对于后续pyinstaller打包较为方便（可以有效的减少打包后的文件体积）。

而从tkinter的具体写法上，也有两种，一种流程式，一种对象式，对比如下：

```python
# 流程式
import tkinter as tk

window = tk.Tk()
window.title('my window')

##窗口尺寸
window.geometry('200x200')

##显示出来
windo.mainloop()
```

以及

```python
# 对象式
import tkinter as tk

class MainApplication(tk.Frame):
    def __init__(self, parent, *args, **kwargs):
        tk.Frame.__init__(self, parent, *args, **kwargs)
        self.parent = parent

        <create the rest of your GUI here>

if __name__ == "__main__":
    root = tk.Tk()
    MainApplication(root).pack(side="top", fill="both", expand=True)
    root.mainloop()
```

一些讨论可以见 [python - Best way to structure a tkinter application? - Stack Overflow](https://stackoverflow.com/q/17466561/8824471)，本处同样鉴于初步尝试，使用“流程式”来进行程序编写。

# GUI编写过程

在上述思想的决定下，我写出了 一个gui版本 [feat: 写一个GUI出来 · Rhilip/NSFC_conclusion_downloader@f14a2c9](https://github.com/Rhilip/NSFC_conclusion_downloader/commit/f14a2c94ede8c3bfe6af450e5f2507ce0b70c827)。

在这个版本，实现了现在的各个控件的基本布局定位，使用grid布局，分成上中下三栏。并通过改写原来的`nsfc_downloader.py` 文件，使得其能适应GUI环境，而不对原CLI调用产生较大的影响。

但这样的程序在随后的调试中发现了更多问题：

1. 国自然官网最近经常性报错Internal Server Error。而原来直接返回错误代码500对于小白来说莫名其妙，不如直接返回错误信息好些。

   ![image-20200709223456540.png](/images/2020/07/357845009.png)

2. 原来点击下载按钮后，因为下载操作涉及大量网络请求，并且内部实现使用id递增，遇到404退出的实现，比较难使用队列+线程形式进行优化。这样就导致下载操作卡住GUI主线程，甚至导致程序被windows系统认为无响应。使用线程的形式进行优化，并再次修改nsfc_downloader的实现，将更多参数抛到对象内部，而不是过程中，主线程使用每1s轮询的形式获取运行时候的参数信息，这样就顺带实现了下载进度的显示。

   ![image-20200709223814569.png](/images/2020/07/3183774054.png)

3. 但是这样改，又引出了一个问题，就是“点击下载”按钮可能被多次点击，所以需要在点击按钮后禁用按钮，并在一个下载任务完成后还原按钮状况，这个和前端防重放一样。

   ```python
   # 禁用按钮
   input_button.config(state='disabled')
   
   <...下载任务..>
   
   # 下载任务完成后，恢复按钮状态
   input_button.config(state='normal')
   ```

## Pyinstaller打包发布

而pyinstaller同样在最开始遇到了一些小问题，如果直接使用 `pyinstaller gui.py` 则出不来exe可执行文件，而加上 `-F`参数后，虽然生成了exe文件，但是是先出现命令行窗口，之后才有GUI出来。

后来重新查阅pyinstaller的文档，终于知道要增加`-w`参数来实现只显示GUI窗口。最终确定使用以下命令进行打包发布

```bash
(venv) NSFC_conclusion_downloader>pip install pyinstaller
(venv) NSFC_conclusion_downloader>pyinstaller gui.py -n nsfc_downloader -Fw
```

生成的程序大小在11M左右，但本项目的核心代码就两个[nsfc_downloader.py](https://github.com/Rhilip/NSFC_conclusion_downloader/blob/master/nsfc_downloader.py), [gui.py](https://github.com/Rhilip/NSFC_conclusion_downloader/blob/master/gui.py) ，整体实现不到10KB。这也因为pyinstaller会打包python解释器以及使用了的库的原因。而即使是个空项目（只有hello world），使用pyinstaller打包出来的体积也在10M以上。

就这样，很圆满的完成了整个GUI的编写，如果基金委那边对于目前输出的结构不做更改的话，之后应该不会再来更新这个repo了。
