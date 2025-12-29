---
title: Github Action 尝试报告
date: 2020-02-27 13:57:16
categories: knowledge
tags: [Github,vue,github action,gh-page,crontab,coverage,phpunit]
permalink: /archives/1201/
---

近期，我为个人的三个仓库分别添加了 GitHub Action 作为CI，此前我也使用过 Travis CI作为CI服务（见 [Rhilip/pt-gen-cfworker](https://github.com/Rhilip/pt-gen-cfworker)），但此次尝试仍有部分地方觉得很有意思，便于此记录。这三个仓库及其使用Action的目的分别如下：

- https://github.com/Rhilip/od_share_frontend ： 基于Vue的gh-page自动构建及部署
- https://github.com/Rhilip/ipv6wry.db： 使用crontab定时更新
- https://github.com/Rhilip/Bencode： PHPUnit自动测试并生成coverage报告上报至 [codacy](https://app.codacy.com/manual/rhilipruan/Bencode/dashboard)

<!--more-->

## 基于Vue的gh-page自动构建及部署

>  Action文件示例： https://github.com/Rhilip/od_share_frontend/blob/master/.github/workflows/gh-pages.yml

Vue的这个稍显简单，主要的部分参见了 [GitHub Pages action · Actions · GitHub Marketplace](https://github.com/marketplace/actions/github-pages-action) 中的Vue站点部署章节。稍微有些不同的是，示例里面的依赖安装以及cache使用了npm，但我实际应该使用yarn作为依赖安装的工具。

所幸，上面 React and Next 的示例部分就说明了yarn的依赖安装和cache使用，仅简单修改适配便可以使用。

![](/images/2020/02/3444113482.png)

## 使用crontab定时更新

> Action 文件示例：https://github.com/Rhilip/ipv6wry.db/blob/master/.github/workflows/update.yml

**ipv6wry.db这个仓库的自动更新文件算是我写的第一个的action.yml了，所以写的磕磕绊绊的（6次commit）**

首先，作为一个定时脚本，在`.github/workflows`中push成功之后，在Action面板中不能看见。必须等到设定的时间之后才能显示出来，再加上初次书写，查看 GitHub Action 的帮助文档多次后，才写出一个结果目前看起来正常的workflow。

![image-20200227211517520.png](/images/2020/02/2718547044.png)

这个workflow的基底是仓库中原有的 [update_ipv6wry.sh](https://github.com/Rhilip/ipv6wry.db/blob/d9843d2c6a860667b65e8c9180d1d13d86d6c088/update_ipv6wry.sh) ，伪代码片单简单示例如下：

```bash
# 变量定义
# 跳转到脚本所在目录
# 获得历史存档，并得到最后一个更新历史
# 请求当前页面信息并获取更新日期

# 比较查看是否存在更新
if update; then
    # 下载数据包到临时目录并解压缩
    # 复制`ipv6wry.db`文件到 `history/{date}/`, `./`
    # 获得更新信息
    # 更新历史 (README.md中的 IP数据记录 | 数据库大小 信息)
    # 清理临时文件
    # 提交更新
fi
```

在将其转换为GitHub Action之后，变量定义移动至 `env` 节中，并使用 `${{ env.key }}` 方法进行调用；而目录跳转（用于bash中）以及temp目录指定，则直接使用 `${{ github.workspace }}` 以及 `${{ runner.temp }}` 

此外，因为 Github Action使用的Ubuntu 18.04中默认已经安装了 7zip以及jq 库，所以相关依赖也不需要进行安装。那么，如何判断确定是否存在更新，仍然使用了if方法（step级别）:

```yaml
    - name: Get last version
      id: last-history
      run: |
        max_history_version=0
        for i in $(ls '${{ github.workspace }}/history'); do
            test_version=$((${i} + 0))
            [[ ${test_version} -gt ${max_history_version} ]] && max_history_version=${test_version}
        done
        echo "::set-output name=last::${max_history_version}"
    - name: Get current version
      id: current-history
      run: |
        echo "::set-output name=current::$(($(curl -L "${{ env.ZXINC_CHECK_URL }}" | jq -r '.newver' ) + 0))"
    - name: Unpack New version
      id: unpack-new
      if: steps.current-history.outputs.current > steps.last-history.outputs.last
      run: |
```

首先，两个 step (`last-history` 和 `current-history`) 分别获得两个输出，在进入 step `unpack-new`的时候，通过 if 进行判断，判断结果成立才运行对应step。值得注意的是，最早step中 if 写成了bash中的写法 `${{ steps.current-history.outputs.now }} -gt ${{ steps.last-history.outputs.last }}` 。直接报错：`Workflow Error`，具体错误栈如下：

```
### ERRORED 00:09:50Z

- Your workflow file was invalid: The pipeline is not valid. .github/workflows/update.yml (Line: 39, Col: 11): Unrecognized named-value: 'steps'. Located at position 1 within expression: steps.current-history.outputs.current,.github/workflows/update.yml (Line: 59, Col: 11): Unrecognized named-value: 'steps'. Located at position 1 within expression: steps.current-history.outputs.current
```

后面修改成直接判断 `steps.current-history.outputs.current > steps.last-history.outputs.last`才正常。可见在 if 段对字段的调用，不需要像run 段中一样。

至于这个脚本，后面三段 （ Unpack New version、 Commit files、 Push changes）能否正常运行，我也不清楚，毕竟从目前结果来看，这三段现在都处在不运行的阶段。。。。

![image-20200227213624598.png](/images/2020/02/3429573452.png)

# PHPUnit自动测试并生成coverage报告上报

> Action 文件示例： https://github.com/Rhilip/Bencode/blob/master/.github/workflows/codacy-analysis-cli.yml

Bencode是本人写的Bencode库，原本打算是为了给ridpt、ob、tjupt等项目以composer库的形式统一提供以方便维护。在有人提出添加测试 ([#1](https://github.com/Rhilip/Bencode/issues/1))之后，便为此添加相关测试以及测试覆盖率报告。

这个workflow一开始不知道在写些什么，从Market中搜到有个action可以使用就直接对着抄了，没想到自己composer install都没做。。。。 ([@b4b38ba](https://github.com/Rhilip/Bencode/commit/b4b38ba6f1811a83fd0118eb75786e7378ac1ccd))

```yaml
name: codacy-analysis-cli

on: ["push"]

jobs:
  codacy-analysis-cli:
    runs-on: ubuntu-latest
    name: codacy-analysis-cli
    steps:
      - uses: actions/checkout@master
      - name: Run codacy-analysis-cli
        uses: mrfyda/codacy-analysis-cli-action@master
        with:
          project-token: ${{ secrets.CODACY_PROJECT_TOKEN }}
```

另外有个原因就是由于  `mrfyda/codacy-analysis-cli-action` 这个模板使用了Docker，导致运行时间过长。在重新查阅codacy相关说明之后，决定抛弃这个模板。改成直接运行。

![image-20200227215122544.png](/images/2020/02/55945015.png)

最终生成的workflow.yaml如下：

```yaml
name: covered-cli

on: ["push"]

env:
  CODACY_PROJECT_TOKEN: ${{ secrets.CODACY_PROJECT_TOKEN }}

jobs:
  covered-cli:
    runs-on: ubuntu-latest
    name: covered-cli
    steps:
      - uses: actions/checkout@master
      - name: Cache dependencies
        uses: actions/cache@v1
        with:
          path: ${{ github.workspace }}/vendor
          key: ${{ runner.os }}-composer-${{ hashFiles('**/composer.json') }}
          restore-keys: |
            ${{ runner.os }}-composer-
      
      - name: Composer install
        run: composer install --no-interaction --prefer-source --dev

      - name: Run PHPUnit
        run: vendor/bin/phpunit --coverage-clover 'clover.xml' tests/

      - name: Run codacy-analysis-cli
        run: |
          curl -LSs "$(curl -LSs https://api.github.com/repos/codacy/codacy-coverage-reporter/releases/latest | jq -r '.assets | map({name, browser_download_url} | select(.name | endswith(".jar"))) | .[0].browser_download_url')" -o codacy-coverage-reporter-assembly.jar
          java -jar codacy-coverage-reporter-assembly.jar report -l php -r clover.xml
```

其中 CODACY_PROJECT_TOKEN 在Codacy面板获取之后填入仓库的secerts中。

目前来看测试的覆盖率还可以：

![image-20200227215628834.png](/images/2020/02/3880664066.png)
