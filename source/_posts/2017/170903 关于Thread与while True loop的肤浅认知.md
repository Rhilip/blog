---
title: 关于Thread与while True loop的肤浅认知
date: 2017-09-03 20:57:00
categories:
 - [Coding, Python]
tags: 
permalink: /archives/571/
---

虽然很久之前就接触了Python的Thread模块，但在之前的应用中也只是依瓢画葫芦，如在已经荒废了很久的 [Rhilip/cn-mooc-dl](https://github.com/Rhilip/cn-mooc-dl) 中，为了加快使用脚本下载的速度，而使用了多线程(Thread+Queue)下载的解决思路。

在这次的发种姬重构中，为了摆脱主线程while True loop循环闲置时候不能够做后台检查，我将部分与后端Database和待发布站点的相关轮询方法使用Thread与while True loop结合起来，在尝试过程中遇到了很多有意思的方法，仅此作以说明

<!--more-->

以下为示意代码，具体可见 [Rhilip/Pt-Autoseed](https://github.com/Rhilip/Pt-Autoseed) 中的实现。

```python
from threading import Thread, Lock  # Lock用来给io进程加锁，此例中未用到。
import time

def period_f(func, sleep_time):
    """
    这是一个while True loop函数，接受一个自定义函数并运行，之后休眠一段时间
    
    :param func: function, 自定义函数
    :param sleep_time: int, func()运行后休眠时间。
    """
    while True:
        func()
        time.sleep(sleep_time)

def func_1():
    print("In function 1")

def func_2():
    print("In function 2")

def main_1():
   Thread(target=period_f(func_1, 5)).start()
   Thread(target=period_f(func_2, 5)).start()

def main_2():
   Thread(target=period_f, args=(func_1, 5)).start()
   Thread(target=period_f, args=(func_2, 5)).start()
   # Thread(target=period_f, kwargs={"func": func_2, "sleep": 5}).start()

def main_3():
   print("Before")
   t=Thread(target=period_f(func_1, 5))
   print("After")
   t.start()
```

在运行时可以发现`main_1()`和`main_2()`有很不同的表现。
其中，`main_1()`一直在`func_1`中，没有跳出
```
In [2]: main_1()
In function 1
In function 1
In function 1
```

而`main_2()`却能实现交替输出（这里设定两个子进程的sleep时间相同）

```
In [3]: main_2()
In function 1
In function 2
In function 1
In function 2
In function 1
In function 2
In function 1
In function 2
```


原因在于，如果在target中先传入了函数及其运行参数，那么在创建线程的时候，会首先调用target的对象，这时如果该对象以具体的函数方法提供，则先进入了while True loop，见以下实例及官方文档参考。
```
In [4]: main_3()     
Before               
In function 1        
In function 1        
```

 > [https://docs.python.org/3/library/threading.html#threading.Thread](https://docs.python.org/3/library/threading.html#threading.Thread)
target is the callable object to be invoked by the run() method. Defaults to None, meaning nothing is called.

 > [https://docs.python.org/3/library/threading.html#threading.Thread.run](https://docs.python.org/3/library/threading.html#threading.Thread.run)
run()
Method representing the thread’s activity.
You may override this method in a subclass. The standard run() method invokes the callable object passed to the object’s constructor as the target argument, if any, with sequential and keyword arguments taken from the args and kwargs arguments, respectively.

故，正确的调用应该是在target中传入所调用的函数名，在args中传入tuple形式的参数（或者在kwargs中传入dict形式的参数）
