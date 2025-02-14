<template>
  <div class="container">
    <div class="main">
      <menus
        :rules="rules"
        :project-list="projectList"
        :current-project="currentProject"
        @saveProject="saveProject"
        @deleteProject="deleteProject"
        @addRule="addRule"
        @editRule="editRule"
        @deleteRule="deleteRule"
        @changeActiveProject="changeActiveProject"
      />
      <div class="content">
        <div class="header">
          <div class="info">
            {{ activeProject.origin }}
            <div class="switch">
              <div class="realRequest">
                <el-switch
                  v-if="activeProject.origin"
                  :value="isTerminalLogOpen"
                  :width="30"
                  @change="isMockLogSwitch"
                />
                <el-tooltip
                  class="tooltip"
                  content="开启后控制台打印 mock 日志"
                  placement="top"
                  effect="light"
                >
                  <span>日志</span>
                </el-tooltip>
              </div>
              <div class="realRequest">
                <el-switch
                  v-if="activeProject.origin"
                  :value="isRealRequest"
                  :width="30"
                  @change="isRealRequestSwitch"
                />
                <el-tooltip
                  class="tooltip"
                  content="开启后添加了 mock 数据的请求也会发送给后端，在控制台 Network 可看到网络请求"
                  placement="top"
                  effect="light"
                >
                  <span>透传</span>
                </el-tooltip>
              </div>
              <div class="realRequest">
                <el-switch
                  v-if="activeProject.origin"
                  :value="toggle"
                  :width="30"
                  @change="toggleSwitch"
                />
                <el-tooltip
                  class="tooltip"
                  content="开启后将根据配置拦截该网站的请求"
                  placement="top"
                  effect="light"
                >
                  <span>拦截</span>
                </el-tooltip>
              </div>
            </div>
          </div>
        </div>
        <div
          class="logs"
          style="overflow-y: scroll; height: 100%"
        >
          <Logs
            v-if="list.length"
            :list="list"
            @editRuleByLog="editRuleByLog"
          />
          <div
            v-else
            style="height: 100%; display:flex;justify-content: center;align-items: center;"
          >
            <img
              src="assets/icons_1/search.png"
              alt="empty"
              height="200"
              width="200"
            >
          </div>
        </div>
      </div>
    </div>
    <el-drawer
      v-if="ruleFormVisible"
      title="编辑规则"
      size="60%"
      :visible.sync="ruleFormVisible"
      direction="rtl"
      custom-class="demo-drawer"
      :wrapper-closable="false"
    >
      <EditorForm
        :data="formData"
        :project-list="projectList"
        @save-form="onSubmit"
      />
    </el-drawer>
    <div
      class="clear-btn"
      @click="clearLogs"
    >
      <el-tooltip
        effect="dark"
        content="清空请求日志"
        placement="top-start"
      >
        <i class="el-icon-remove" />
      </el-tooltip>
    </div>
  </div>
</template>

<script>
import { parse } from 'flatted'
import Url from 'url-parse'
import EditorForm from './components/form.vue'
import Menus from './components/menus.vue'
import Logs from './components/logs.vue'
import {
  saveStorage,
  AJAX_INTERCEPTOR_CURRENT_PROJECT,
  AJAX_INTERCEPTOR_PROJECTS,
} from '@/store'
import { EXTENSION_EVENT_NAME } from '@/contentScripts'

export default {
  components: {
    EditorForm,
    Menus,
    Logs,
  },
  data() {
    return {
      currentProject: '',
      projectList: [],
      ruleFormVisible: false,
      formData: {
        path: '',
        method: 'GET',
        response: '',
        switchOn: true,
      },
      list: [],
    }
  },
  computed: {
    activeProject() {
      const current =
        this.projectList.find(item => item.name === this.currentProject) || {}
      return current
    },
    rules() {
      return this.activeProject.rules || []
    },
    toggle() {
      return this.activeProject.switchOn
    },
    isRealRequest() {
      return this.activeProject.isRealRequest
    },
    isTerminalLogOpen() {
      return this.activeProject.isTerminalLogOpen
    },
  },
  mounted() {
    chrome.storage.local.get(
      [AJAX_INTERCEPTOR_PROJECTS, AJAX_INTERCEPTOR_CURRENT_PROJECT],
      result => {
        this.currentProject = result[AJAX_INTERCEPTOR_CURRENT_PROJECT]
        this.projectList = result[AJAX_INTERCEPTOR_PROJECTS] || []
      }
    )
    chrome.runtime.onMessage.addListener(event => {
      try {
        if (event.type === EXTENSION_EVENT_NAME) {
          const result = event.detail
          this.list = [result, ...this.list]
        }
      } catch (e) {
        console.warn('sddddddddddd', e, event)
      }
    })
  },
  methods: {
    onSubmit(data) {
      const { projectName, isAdd, ...formData } = data
      const current = this.projectList.find(item => item.name === projectName)
      let rules = current.rules || []

      const index = rules.findIndex(item => {
        const ruleName = isAdd ? formData.name : this.formData.name
        return item.name === ruleName
      })

      if (index >= 0) {
        rules[index] = formData
      } else {
        rules = [...rules, formData]
      }
      const activeProject = { ...current, rules }
      this.formData = {}
      this.ruleFormVisible = false
      this.saveProject(activeProject, activeProject.name)
    },
    editRuleByLog(item) {
      this.ruleFormVisible = true
      const rulePath = item.response.rulePath

      if (rulePath) {
        const method = item.request.method
        const rule =
          this.activeProject.rules?.find(
            ruleItem => ruleItem.path === rulePath && method === ruleItem.method
          ) || {}
        this.formData = {
          ...rule,
          projectName: this.activeProject.name,
          isAdd: false,
        }
        return
      }
      // TODO: 接口 404 的时候有 bug
      const { response, request } = item
      let tmpRes = ''
      try {
        tmpRes = JSON.parse(response.responseTxt)
      } catch (e) {
        console.log(e)
      }
      const targetUrl = new Url(request.url)
      this.formData = {
        projectName: this.activeProject.name,
        switchOn: true,
        method: request.method,
        response: tmpRes,
        path: targetUrl.pathname,
        isAdd: true,
      }
    },
    addRule(projectName) {
      this.formData = {
        projectName: projectName,
        isAdd: true,
      }
      this.ruleFormVisible = true
    },
    editRule(projectName, rule) {
      this.ruleFormVisible = true
      this.formData = {
        ...rule,
        isAdd: false,
        projectName,
      }
    },
    deleteRule(projectName, rule) {
      const current = this.projectList.find(item => item.name === projectName)
      let rules = current.rules || []

      const index = rules.findIndex(item => {
        return item.name === rule.name
      })

      rules.splice(index, 1)
      const activeProject = { ...current, rules }
      this.saveProject(activeProject, activeProject.name)
    },
    changeActiveProject(project) {
      saveStorage(AJAX_INTERCEPTOR_CURRENT_PROJECT, project)
      this.currentProject = project
    },
    toggleSwitch(event) {
      const activeProject = { ...this.activeProject, switchOn: event }
      this.saveProject(activeProject, activeProject.name)
    },
    isRealRequestSwitch(event) {
      const activeProject = { ...this.activeProject, isRealRequest: event }
      this.saveProject(activeProject, activeProject.name)
    },
    isMockLogSwitch(event) {
      const activeProject = { ...this.activeProject, isTerminalLogOpen: event }
      this.saveProject(activeProject, activeProject.name)
    },
    saveProject(project, editProjectName) {
      let { projectList } = this

      const index = projectList.findIndex(item => {
        return item.name === editProjectName
      })

      if (editProjectName) {
        projectList[index] = { ...projectList[index], ...project }
        if (editProjectName === this.currentProject) {
          this.changeActiveProject(project.name)
        }
      } else {
        projectList = [...projectList, project]
        this.changeActiveProject(project.name)
      }
      this.projectList = [...projectList]
      saveStorage(AJAX_INTERCEPTOR_PROJECTS, [...projectList])
    },
    deleteProject(projectName) {
      let { projectList } = this

      const index = projectList.findIndex(item => {
        return item.name === projectName
      })

      projectList.splice(index, 1)
      this.projectList = [...projectList]
      saveStorage(AJAX_INTERCEPTOR_PROJECTS, this.projectList)

      if (projectName === this.currentProject && projectList.length) {
        this.changeActiveProject(projectList[0].name)
      }
    },
    clearLogs() {
      this.list = []
    },
  },
}
</script>
<style>
* {
  padding: 0;
  margin: 0;
  box-sizing: border-box;
  cursor: default;
}

ul {
  margin: 0;
}

li {
  list-style: none;
}

html {
  font-size: 14px;
  user-select: none;
  height: 100%;
  width: 100%;
  -ms-overflow-style: none;
}

body {
  font-family: Helvetica, Tahoma, Arial, 'Microsoft YaHei', '微软雅黑', SimSun,
    Heiti, '黑体', sans-serif, STXihei, '华文细黑';
  font-size: 1em;
  height: 100%;
  width: 100%;
}

*::-webkit-input-placeholder {
  color: #aeaeae;
  font-size: 12px;
  line-height: 20px;
}

::-webkit-scrollbar {
  width: 6px;
  height: 8px;
  background-color: rgba(0, 0, 0, 0);
}

::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0);
}

::-webkit-scrollbar-thumb {
  border-radius: 10px;
  -webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
  background-color: rgba(174, 174, 174, 0.5);
}
</style>
<style lang="scss" scoped>
.container {
  height: 100%;
  width: 100%;

  .header {
    position: absolute;
    top: 0;
    z-index: 2;
    width: 100%;
    background: #fff;
    padding: 0 16px;

    .info {
      height: 50px;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .switch {
        display: flex;
        align-items: center;

        .realRequest {
          display: flex;
          align-items: center;

          .tooltip {
            margin-left: 5px;
          }
        }
      }

      .realRequest:not(:last-child) {
        margin-right: 20px;
      }
    }
  }

  .main {
    height: 100%;
    width: 100%;
    min-height: 650px;
    min-width: 900px;
    position: relative;
    overflow: hidden;
    display: flex;
  }

  .content {
    padding-top: 50px;
    position: relative;
    flex-grow: 1;
    flex-shrink: 1;
    background-color: #f3f4f6;
  }
}

.log-item {
  height: 20px;
  line-height: 20px;

  &:hover {
    background: #eee;
  }
}

.clear-btn {
  right: 40px;
  bottom: 40px;
  position: fixed;
  background-color: #fff;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 0 6px rgb(0 0 0 / 12%);
  cursor: pointer;
  z-index: 5;
}
</style>
