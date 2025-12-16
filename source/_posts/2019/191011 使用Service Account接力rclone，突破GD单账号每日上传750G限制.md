---
title: 使用Service Account接力rclone，突破GD单账号每日上传750G限制
date: 2019-10-11 03:50:00
categories: knowledge
tags: [rclone,google drive,folderclone,service account,google]
permalink: /archives/1135/
---

~~嗯，标题比较绕口，改了好几遍都觉得不好。~~
不过本文的目的在于：

**暂时只针对本地文件上传GD/TD，GD/TD内互传可能不适用**

1. 创建Service Account并添加到teamdrive（现在也叫共享云端硬盘）中。（至于为什么要用SA，当然是因为创建真实用户账户成本过高，而且不能批量添加呀。）
2. 使用python脚本运行rclone，以多账户协力的形式突破单账号750G上传限制，并在对应账户上传超限（750G/帐号）时进行切换。

其中第一步的主要思想来自folderclone，第二步相关实践来自 @superstaraug 等人，对此分别表示感谢。

成品项目见：<https://github.com/Rhilip/AutoRclone>

此文的目的在于上传文件到共享云端硬盘，仅在部分步骤中利用了folderclone相关脚本（所以偷懒直接fork修改了）来批量创建Service Account并添加到teamdrive中。
如果你对[folderclone](https://github.com/Spazzlo/folderclone)将`TD to GD`，`shared to GD`（即“他人分享转成自己可管理文件”），`TD to TD`等Google Drive内部文件捣腾玩法感兴趣，你可以参考本文的参考链接第一条。

参考链接：

- [Folderclone谷歌google共享云端硬盘转存相互转移拷贝复制文件的正确姿势](https://567899.xyz/google_drive_folderclone.html)
- [解决Rclone挂载Google Drive时上传失败和内存占用高等问题 - Rat's Blog](https://www.moerats.com/archives/877/)
- [Google drive - Rclone](https://rclone.org/drive)

补充方案： [rclone 750G 自动换号 – AutoRclone – Google 迷](https://www.gfan.loan/?p=235)

> **本文非 <https://github.com/xyou365/AutoRclone> 项目相关介绍及教程，请勿在本人Blog中询问。**

============================


**请注意：本教程第一、二部分教程使用OAuth2客户端形式完成，与 [567899.xyz](https://567899.xyz/google_drive_folderclone.html) 等人手动创建辅助账户不同，请视你需要，选择本教程或参考该他人教程，完成Service Account的创建以及Shared Drive用户添加，并得到SA的JSON文件。如果你已经完成了上述步骤，请直接跳转本教程第三部分Rclone设置。**

> **请根据你个人需求创建项目数量，已知限制如下**：
>
> 1. 一个真实帐号最多能创建12（或25）个项目，每个项目最多100个SA账户，每个账户（无论是真实还是SA）每日最多上传750G
> 2. 一个共享云端硬盘最多添加600个账户

<!--more-->

---------------------------

## 创建Google Cloud项目

**一、在 [Google云端控制台](https://console.developers.google.com/) 上新建项目，填入项目名称并完成创建**

![1570709104710.png](/images/2019/10/1022759091.png)

**二、点击【OAuth同意屏幕】，填入应用名称并点击最下面的保存**

![1570709308683.png](/images/2019/10/4101241258.png)

**三、保存后会自动跳转到【凭据】页面，点击创建【OAuth客户端ID】**

![1570709407196.png](/images/2019/10/802385660.png)

**应用类型选【其他】**

![1570709497698.png](/images/2019/10/3064075346.png)

**不用在意弹出的客户端ID和密钥窗口，直接点击下载JSON格式的认证文件，并重命名为`credentials.json`备用。**

![1570709606800.png](/images/2019/10/328209878.png)

## 使用Folderclone中脚本添加共享云端硬盘成员

> **如果你使用科学方式上网，请保证CMD走代理！！！！！**
> **请使用有浏览器环境（非Remote或者headless）的环境进行配置**

**一、 安装Python3，克隆项目文件，使用pip安装依赖（具体步骤就不搬运截图了）**

```bash
git clone https://github.com/Rhilip/folderrclone.git
cd folderrclone
pip3 install -r requirements.txt
```

**二、将前面JSON格式的OAuth凭据文件`credentials.json`复制到项目文件夹目录下，并运行`multifactory.py`文件**

```
cp credentials.json .
python multifactory.py --quick-setup 1
```

其中，`--quick-setup`后面跟着的数字为你想要创建的Project数量，并在每个project中创建满100个Service Account。（当该数字大于你能有的最大项目数(12)时，会为当前所有project添加SA帐号。）

会弹出Google登录页面，登录你刚才创建项目帐号，由于我们是随意创建的OAuth应用会提示应用未经过认证，不用管它，点开高级，并转至该应用。

![1570710231244.png](/images/2019/10/86090344.png)

然后在新的页面中允许应用申请的3个权限

![1570710318361.png](/images/2019/10/2327005101.png)

并确认

![1570710355751.png](/images/2019/10/2682855993.png)

然后回到Python窗口，其中可能出现如下提示，打开画线部分链接，并启用【Service Useage API】

![1570710691753.png](/images/2019/10/2067564609.png)

![1570710787359.png](/images/2019/10/2382406670.png)

启用后稍等几秒回到Python窗口，等待应用跑完（消耗时间视你创建Service Account数量）。

![1570711532924.png](/images/2019/10/3202889619.png)

> multifactory.py 还支持以下调用参数，如果你不知道具体用法则不用附加。
> 其中我觉得还有用的有 `--new-only` 方法，这样可以保证创建的Service Account都在新的项目中，而不占用老项目的名额空间，因为默认情况下multifactory脚本会首先尝试在已经存在的项目中创建Service Account。
>
![1570711893413.png](/images/2019/10/2637980502.png)

跑完后在项目目录会自动生成 `accounts`目录，其中一堆JSON文件就是我们需要的`service_account_credentials`文件，留存备用

![1570711771003.png](/images/2019/10/3222189175.png)

**三、然后使用folderclone脚本将生成的Service Account用户添加到该共享云端硬盘中，folderclone会自动设置Service Account权限为内容管理员。**

查看【共享云端硬盘】的ID，请注意你（即前面创建并认证登录的用户）应该是该共享云端硬盘的管理员角色

![1570712181991.png](/images/2019/10/1619639242.png)

然后运行下面命令，其中`SDFolderID`需要改成前面查看的对应【共享云端硬盘】的ID

```bash
python masshare.py -d SDFolderID
```

![1570712330951.png](/images/2019/10/1498021363.png)

结果如下，可以看到前面生成的IAM账户均被添加到该【共享云端硬盘】中了

![1570712442974.png](/images/2019/10/80793250.png)

## 设定rclone自动备份及切换

通常情况下（即本人是这么使用的），我们用crontab定时跑一个`rclone move/copy/sync`方法，这样会存在几个问题，即：

- 如果crontab时间过密，前一个rclone尚未跑完就拉起了另一个rclone进程（特别是750G后长时间等待），导致产生了大量rclone占用系统io资源
- rclone在消耗完某一账户的750G后不能自动更换，导致长时间等待。
- 使用`--max-transfer 750G`（或更低的配额）做限制。在触碰到限制时，rclone会直接退出而不是平滑停止，即不考虑将正在传输的文件传完。（[#2672](https://github.com/ncw/rclone/issues/2672)）

本处尽可能尝试解决这些问题。

**一、修改设置rclone配置文件**

修改rclone配置文件（一般位于`$HOME/.config/rclone/rclone.conf`），添加如下字段

```
[GDrive]
type = drive
scope = drive
service_account_file = 
team_drive = SDFolderID
```

其中`SDFolderID`需要改成前面查看的对应【共享云端硬盘】的ID

**注意：**

- 你也可以使用`rclone config`的形式交互添加，并在rclone提示如下信息时，任意填入一个上面步骤在`account`目录生成的JSON文件

```
Service Account Credentials JSON file path
Leave blank normally.
Needed only if you want use SA instead of interactive login.
Enter a string value. Press Enter for the default ("").
service_account_file> C:\Repositories\folderclone\accounts\xxxxxxxxxxxxxxxxxxx.json
Edit advanced config? (y/n)
y) Yes
n) No
y/n> n
Remote config
Configure this as a team drive?
y) Yes
n) No
y/n> y
Fetching team drive list...
Choose a number from below, or type in your own value
 1 / xxxxxxx@xxxxxx
   \ "xxxxxxxxxxxxxxxxxx"
Enter a Team Drive ID> 1
```

- 使用rclone自带的`client id和client secert`在大流量情况下可能出现403 Rate Limit等问题，你可以参照下面教程，创建自己的client id和client secert信息，并填入配置项中

  - rclone官方文档 [Making your own client_id - Google drive - Rclone](https://rclone.org/drive/#making-your-own-client-id) 
  - 或者 Rat‘s的这篇教程 [解决Rclone挂载Google Drive时上传失败和内存占用高等问题 - Rat's Blog](https://www.moerats.com/archives/877/)

> 以下为一家之言：个人认为没有必要进行该设置，因为根据Rclone的官方文档说明，他们的API限额经过了特殊的提升，你自己申请的不一定能比得上。如果你没有遇到该问题，请使用rclone默认，即不要添加`client_id`和`client_secert`配置项

  填入自己的client id和client secert信息后配置项结构如下（修改字段`ClientID,ClientSecert,SDFolderID`）

```
[GDrive]
client_id = ClientID
client_secert = ClientSecert
type = drive
scope = drive
service_account_file = 
team_drive = SDFolderID
```

二、配置`autorclone.py`参数

`autorclone.py`文件是本人在 @superstaraug 等人实践上修改的rclone多帐号切换脚本

> 注意：如果你没有使用本教程前面的步骤，你可能需要安装python依赖库，方法如下
```
pip3 install psutil filelock
```

使用前需要修改部分配置信息（该部分可能随版本迭代有些不同，请根据你使用的文件配置说明修改）

```bash
vi autorclone.py
```

依次设置如下配置项，请根据注释说明修改
（如果你是在linux上跑的脚本，一般不需要对配置项进行较多的更改，修改`sa_json_folder`和`cmd_rclone`基本就可以了）

> **这里只是配置项信息，完整python文件请在文章开头的Github中下载**

```python
# ------------配置项开始------------------

# Account目录
sa_json_folder = r'/root/folderrclone/accounts'  # 绝对目录，最后没有 '/'，路径中不要有空格

# Rclone运行命令
# 1. 填你正在用/想要用的，这里写的是move，也可以是copy/sync ......
# 2. 建议加上 `--rc` ，不加也没事，后面脚本会自动加上的
# 3. 因为不起screen，如果你希望关注rclone运行的状态，请一定要用 `--log-file` 将rclone输出重定向到文件
cmd_rclone = 'rclone move /home/tomove GDrive:/tmp --drive-server-side-across-configs -v --log-file /tmp/rclone.log'

# 检查rclone间隔 (s)
check_after_start = 60  # 在拉起rclone进程后，休息xxs后才开始检查rclone状态，防止 rclone rc core/stats 报错退出
check_interval = 10  # 主进程每次进行rclone rc core/stats检查的间隔

# rclone帐号更换监测条件
switch_sa_level = 1  # 需要满足的规则条数，数字越大切换条件越严格，一定小于下面True（即启用）的数量，即 1 - 4(max)
switch_sa_rules = {
    'up_than_750': False,  # 当前帐号已经传过750G
    'error_user_rate_limit': False,  # Rclone 直接提示rate limit错误
    'zero_transferred_between_check_interval': True,  # 100次检查间隔期间rclone传输的量为0
    'all_transfers_in_zero': False,  # 当前所有transfers传输size均为0
}

# rclone帐号切换方法 (runtime or config)
# runtime 是修改启动rclone时附加的 `--drive-service-account-file` 参数
# config  是修改rclone的配置文件 `$HOME/.config/rclone/rclone.conf` ，此时你需要指定后面的rclone配置参数参数
switch_sa_way = 'runtime'

# rclone配置参数 （当且仅当 switch_sa_way 为 `config` 时使用，且需要修改）
rclone_config_path = '/root/.config/rclone/rclone.conf'  # Rclone 配置文件位置
rclone_dest_name = 'GDrive'  # Rclone目的地名称（与cmd_rclone中对应相同，并保证SA均已添加）

# 本脚本临时文件
instance_lock_path = r'/tmp/autorclone.lock'
instance_config_path = r'/tmp/autorclone.conf'

# 本脚本运行日志
script_log_file = r'/tmp/autorclone.log'
logging_datefmt = "%m/%d/%Y %I:%M:%S %p"
logging_format = "%(asctime)s - %(levelname)s - %(threadName)s - %(funcName)s - %(message)s"

# ------------配置项结束------------------
```

脚本设置了多种规则来检查当前Rclone脚本是否超过750G限制。只有当所有启用的监测规则均命中时，脚本才会切换到下一个帐号。（所以不要过多的启用监测规则，以防止应切换时未能正常切换）

> 2019.10.12PM17 更新：
> 1. 在本脚本运行项中添加`last_pid`参数以及依赖库`psutil`，使得脚本在运行时会首先尝试检查该pid信息，防止前一次运行过程中脚本意外退出，但是rclone进程未退出导致的孤儿进程情况。

配置完后就可以测试运行了，相关的运行结果会直接数出在stdout和配置的日志文件中。
除了在需要时在screen中手动调用之外，也可直接加入crontab中定时运行，脚本采用单例模式，所以不会导致过多rclone进程被创建。

```crontab
0 */1 * * * /usr/bin/python3 /path/to/autorclone.py
```

## 其他

1. `remove.py`提供了快速从Shared Drive中删除SA的方式，如果你已经不需要SA了，可以使用该文件进行删除。对应使用方法见下，其中ROLE的取值可为 `['owner', 'organizer', 'fileorganizer', 'writer', 'reader', 'commenter']`中任一一个。使用脚本批量添加的ROLE值为 `fileorganizer` (即content manager) ，但更建议你使用`--prefix` （前缀） 和`--suffix` （后缀） 匹配SA邮箱的形式来删除，防止误伤。

   ```
   PS C:\Repositories\folderclone> python .\remove.py --help
   usage: remove.py [-h] [--token TOKEN] [--credentials CREDENTIALS]
                    (--prefix PREFIX | --suffix SUFFIX | --role ROLE) --drive-id
                    DRIVE_ID
   
   A tool to remove users from a Shared Drive.
   
   optional arguments:
     -h, --help            show this help message and exit
     --token TOKEN         Specify the pickle token file path.
     --credentials CREDENTIALS
                           Specify the credentials file path.
     --prefix PREFIX       Remove users that match a prefix.
     --suffix SUFFIX       Remove users that match a suffix.
     --role ROLE           Remove users based on permission roles.
   
   required arguments:
     --drive-id DRIVE_ID, -d DRIVE_ID
                           The ID of the Shared Drive.
   ```
