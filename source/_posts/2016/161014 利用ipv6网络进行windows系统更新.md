---
title: 利用ipv6网络进行windows系统更新
date: 2016-10-14 23:51:00
categories:
 - Knowledge
tags:
 - IPv6
 - Windows
permalink: /archives/114/
---

本教程只适用于Windows专业版及其更高级版本，家庭版由于被阉割了策略组功能，可以试试修改注册表的方法。

不建议食用人群：

 - 如果你首先尝试修改了IPv6连接的DNS，请在食用本教程前，请先尝试“ping download.windowsupdate.com”，看相应服务器地址是否为IPv6地址，如果已经是了，不建议食用。
 - 参与了Windows 10的内测用户也不建议食用本教程，很可能会因此收不到内测推送。
 - 使用360等第三方软件进行系统更新的同样无法食用本教程，不过国产安全软件可以使用内网P2SP的形式大幅度减少Windows系统更新时使用的流量。

> 感谢 天空の遗落物@6v 的教程初稿，并允许本人在blog中转载。

<!--more-->


# 利用组策略指定Windows更新服务器
 1. 运行命令框输入 “gpedit.msc”，然后确定（运行命令框可用“windows键+R”打开）

    ![160036cqp61tda9mq1mgma.png](/images/2016/4111867163.png)

 2. 依次在左侧列表选择“计算机配置”-“管理模板”-“windows组件”-“windows更新”，然后在右侧选择“指定 Internet Microsoft更新服务位置”，双击打开。

    ![161024nk9hb8fn8lmkkelk.png](/images/2016/1796251039.png)

 3. 选择“已启用”，然后再下面的两个框中均填入此地址 `http://windowsupdate.sjtu.edu.cn/` 然后确定。

    ![161356wkk8yhr3vhf080y7.png](/images/2016/2453840200.png)

 4. 找到hosts文件，文件在C:\windows\system32\drivers\etc 这个文件夹下，先把hosts文件复制粘贴到桌面上，然后双击以记事本打开，然后再最后一行加上这个“2001:da8:8000:6183:400::63:208 windowsupdate.sjtu.edu.cn”，保存，然后把桌面这个文件在粘贴回去替换原来的hosts文件。

    ![161816ca554yaau4fokos9.png](/images/2016/1300831243.png)

# 利用注册表指定Windows更新服务器
此方法适用于Windows家庭版等无组策略用户，通过导入注册表文件的形式指定Windows更新服务器。

 1. 在桌面新建一空白的文本文件，并填入后保存。

    ```
    Windows Registry Editor Version 5.00
    
    [HKEY_LOCAL_MACHINE/SOFTWARE/Policies/Microsoft/Windows/WindowsUpdate/AU]
    "NoAutoUpdate"=dword:00000000
    "AUOptions"=dword:00000002
    "ScheduledInstallDay"=dword:00000000
    "UseWUServer"=dword:00000001
    
    [HKEY_LOCAL_MACHINE/SOFTWARE/Policies/Microsoft/Windows/WindowsUpdate]
    "WUServer"="http://windowsupdate.sjtu.edu.cn/"
    "WUStatusServer"="http://windowsupdate.sjtu.edu.cn/"
    "TargetGroupEnabled"=dword:00000001
    "TargetGroup"="reg"
    ```

 2. 修改文件后缀名改为 .reg，最后导入注册表（导入前请备份注册表相关键值！！！以备以后恢复），重启。
 3. 同上，将“2001:da8:8000:6183:400::63:208 windowsupdate.sjtu.edu.cn”添加到hosts文件中。
