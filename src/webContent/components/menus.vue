<template>
  <div class="menu">
    <div class="box">
      <div class="projects-list">
        <div
          v-for="item in projectList"
          :key="item.name"
          class="item"
        >
          <div
            :class="['project-name', item.name === currentProject ? 'active' : '']"
            @click="changeProject(item.name)"
          >
            <div>
              <span
                class="icon-circle"
                :style="{ background: item.color }"
              />
              {{
                item.name
              }}
            </div>
            <span>
              <el-dropdown @command="(c) => handleCommand(item, c)">
                <i class="el-icon-more-outline" />
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item command="addRule">
                    <i class="el-icon-circle-plus-outline" />新增规则
                  </el-dropdown-item>
                  <el-dropdown-item command="editProject">
                    <i class="el-icon-edit" />编辑项目
                  </el-dropdown-item>
                  <el-dropdown-item
                    command="deleteProject"
                    @click="deleteProjectByName(item.name)"
                  >
                    <i class="el-icon-delete" />删除项目
                  </el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </span>
          </div>
          <div
            v-if="item.name === currentProject"
            class="rule-items"
          >
            <div
              v-if="rules.length > 1"
              style="margin: 10px 0;"
            >
              <span style="margin-left: 20px; font-size: 16px;font-weight: 400;color: #04B34C;">过滤 url：</span>
              <el-input
                v-model="searchName"
                size="mini"
                placeholder="输入关键字搜索"
                clearable
                style="width: 260px;"
              />
            </div>
            <div
              v-for="rule in tableList"
              :key="rule.path"
              class="rule-item"
              @click="editRule(item.name, rule)"
            >
              <span class="rule-name">
                <span
                  v-if="rule.method === 'GET'"
                  class="get-info"
                >GET</span>
                <span
                  v-if="rule.method === 'POST'"
                  class="post-info"
                >POST</span>
                <span>
                  {{ rule.name }}
                </span>
              </span>
              <span>
                <span
                  class="rule-status"
                  :style="{ height: '10px', width: '10px', background: rule.switchOn ? '#67C23A' : 'red' }"
                >*</span>
                <el-popconfirm
                  title="确定删除吗？"
                  @confirm="deleteRule(item.name, rule)"
                >
                  <span
                    slot="reference"
                    class="delete-btn"
                    @click.stop
                  >
                    <i class="el-icon-delete" />
                  </span>
                </el-popconfirm>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <import-dialog v-model="importDialogVisible" />
    <el-dialog
      :title="editProjectName ? '编辑项目' : '新增项目'"
      :visible.sync="dialogFormVisible"
      width="400px"
      :show-close="true"
      :modal-append-to-body="false"
      :close-on-click-modal="false"
    >
      <el-form
        ref="projectForm"
        :model="form"
        :rules="formRules"
        label-width="80px"
      >
        <el-form-item
          label="项目名称"
          prop="name"
        >
          <el-input
            v-model.trim="form.name"
            placeholder="项目名称"
          />
        </el-form-item>
        <el-form-item
          label="项目域名"
          prop="origin"
        >
          <el-input
            v-model="form.origin"
            :placeholder="originPlaceholder"
          />
        </el-form-item>
        <el-form-item label="标识色">
          <el-color-picker v-model="form.color" />
        </el-form-item>
      </el-form>
      <div
        slot="footer"
        class="dialog-footer"
      >
        <el-button @click="dialogFormVisible = false">
          取 消
        </el-button>
        <el-button
          type="primary"
          @click="saveProject"
        >
          确 定
        </el-button>
      </div>
    </el-dialog>
    <el-dialog
      title="删除项目"
      :visible="!!deleteProjectName"
      width="300px"
      :show-close="false"
      :modal-append-to-body="false"
    >
      <div slot="title">
        <i
          class="el-icon-warning-outline"
          style="color: #E6A23C;font-weight: bold;"
        />
        删除<span style="font-weight: bold;">{{ deleteProjectName }}</span> 项目
      </div>
      <div style="color: #909399;line-height: 40px;margin: -20px 0;">
        项目下的所有配置随之清空
      </div>
      <div
        slot="footer"
        class="dialog-footer"
      >
        <el-button @click="deleteProjectName = ''">
          取 消
        </el-button>
        <el-button
          type="primary"
          @click="confirmDeleteProject"
        >
          确 定
        </el-button>
      </div>
    </el-dialog>
    <div class="operator">
      <div>
        <el-button
          type="text"
          @click="addProject()"
        >
          <span>
            <i class="el-icon-plus" />
            添加地址
          </span>
        </el-button>
        <el-tooltip content="将插件配置以 JSON 文件的形式导出，方便迁移共享配置">
          <el-button
            type="text"
            @click="exportData()"
          >
            <span>
              <i class="el-icon-download" />
              导出数据
            </span>
          </el-button>
        </el-tooltip>
        <el-tooltip content="导入插件的 JSON 共享配置">
          <el-button
            type="text"
            @click="showImportDialog()"
          >
            <span>
              <i class="el-icon-upload2" />
              导入数据
            </span>
          </el-button>
        </el-tooltip>
        <!-- <a
          href="https://just-mock.vercel.app/"
          target="_blank"
          style="color:#409EFF;text-decoration: none;"
        >
          <span>
            <i class="el-icon-link" />
            文档
          </span>
        </a> -->
      </div>
    </div>
  </div>
</template>

<script>
import { exportJSON } from '../utils'

const originRegx = /^(?=^.{3,255}$)(http(s)?:\/\/)(www\.)?[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62}){0,}(:\d+)*$/
const originPlaceholder = 'protocal://hostname[:port]'
import ImportDialog from './import-dialog.vue'

export default {
  components: {
    ImportDialog
  },
  props: {
    rules: {
      type: Array,
      default: () => []
    },
    currentProject: {
      type: String,
      default: ''
    },
    projectList: {
      type: Array,
      default: () => []
    },
  },
  data() {
    const checkProjectNameUnique = (_rule, value, callback) => {
      const editProjectName = this.editProjectName
      const exitsProjectList = this.projectList.filter(item => item.name !== editProjectName)

      const index = exitsProjectList.findIndex(item => item.name === value)
      if (index >= 0) {
        callback('已存在同名的项目，请换个名吧')
      } else {
        callback()
      }
    }
    return {
      deleteFormVisible: true,
      dialogFormVisible: false,
      originPlaceholder,
      editProjectName: '',
      deleteProjectName: '',
      importDialogVisible: false,
      form: {
        color: '#409EFF',
        switchOn: true,
      },
      formRules: {
        name: [
          { required: true, message: '请输入项目名称', trigger: 'blur' },
          { validator: checkProjectNameUnique, trigger: 'blur' }
        ],
        origin: [
          { required: true, message: '请输入项目域名', trigger: 'blur' },
          {
            pattern: originRegx, message: `请输入符合规格的域名，${originPlaceholder}`
          }
        ]
      },
      searchName: ''
    }
  },
  computed: {
    tableList() {
      if (this.searchName === '') {
        return this.rules
      }
      return this.rules.filter(item => item.path.includes(this.searchName))
    }
  },
methods: {
  addRule(projectName) {
    this.$emit('addRule', projectName)
  },
  editRule(projectName, rule) {
    this.$emit('editRule', projectName, rule)
  },
  deleteRule(projectName, rule) {
    this.$emit('deleteRule', projectName, rule)
  },
  addProject() {
    this.editProjectName = ''
    this.form = {
      color: '#409EFF',
      switchOn: true,
      origin: 'http://localhost:'
    }
    this.dialogFormVisible = true
  },
  exportData() {
    exportJSON(this.projectList, 'just-mock-config.json')
  },
  handleCommand(item, command) {
    if (command === 'deleteProject') {
      this.deleteProjectByName(item.name)
    }

    if (command === 'editProject') {
      this.editProject(item.name)
    }

    if (command === 'addRule') {
      this.addRule(item.name)
    }
  },
  saveProject() {
    this.$refs.projectForm.validate((valid) => {
      if (valid) {
        this.dialogFormVisible = false;
        const editProjectName = this.editProjectName
        this.$emit('saveProject', { ...this.form }, editProjectName)
        this.form = { color: '#409EFF' }
        this.editProjectName = ''
        return
      }
    })
  },
  deleteProjectByName(projectName) {
    this.deleteProjectName = projectName
  },
  confirmDeleteProject() {
    const projectName = this.deleteProjectName
    this.$emit('deleteProject', projectName)

    this.deleteProjectName = ''
  },
  editProject(projectName) {
    this.dialogFormVisible = true
    this.editProjectName = projectName
    const editProject = this.projectList.find(item => item.name === projectName)

    this.form = { ...editProject }
  },
  changeProject(project) {
    this.searchName = ''
    this.$emit('changeActiveProject', project)
  },
  showImportDialog() {
    this.importDialogVisible = true
  },
  // linkToDocs() {
  //   location.href = 'https://just-mock.vercel.app/'
  // }
},
}
</script>

<style lang="scss" scoped>
.menu {
  overflow: hidden;
  position: relative;
  flex-basis: 450px;
  flex-grow: 0;
  flex-shrink: 0;
  background: #fff;
  box-shadow: 0 0 3px 1px rgb(237 237 237 / 70%);
  padding-bottom: 42px;
  z-index: 10;

  .box {
    overflow-x: hidden;
    overflow-y: scroll;
    padding-top: 12px;
    width: 100%;
    height: 100%;
  }

  .operator {
    &>div {
      display: flex;
      justify-content: space-between;
      align-items: center;

      span {
        cursor: pointer;
      }
    }

    position: absolute;
    bottom: 0;
    z-index: 4;
    width: 100%;
    border-top: 1px solid #f4f4f4;
    background-color: #fff;
    padding: 2px 12px;
    font-size: 12px;
  }
}

.projects-list {
  .item {
    .project-name {
      cursor: pointer;
      padding: 0 8px;
      height: 38px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #fff;

      &>div {
        height: 38px;
        line-height: 38px;
        cursor: pointer;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      &>* {
        vertical-align: middle;
      }

      &.active {
        background-color: #ecf8ff;
        color: #409EFF;
        border-radius: 4px;
      }
    }
  }
}

.rule-items {
  &>.rule-item {
    font-size: 16px;
    color: black;
    padding: 0 8px 0 24px;
    cursor: pointer;
    height: 30px;
    line-height: 30px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .delete-btn {
      display: none;
      cursor: pointer;
    }

    .rule-name {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      cursor: pointer;
    }

    .rule-status {
      display: inline-block;
      font-size: 0;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      // background: #67C23A;
      margin-top: 15px;
    }

    &:hover {
      .delete-btn {
        display: inline-block;
      }

      .rule-status {
        display: none;
      }

      background-color: #f5f5f5;
    }
  }
}

.icon-circle {
  vertical-align: middle;
  margin-right: 6px;
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.get-info {
  display: inline-block;
  width: 2.8em;
  color: #23966C;
  font-weight: bold;
}

.post-info {
  display: inline-block;
  width: 2.8em;
  color: #B3680C;
  font-weight: bold;
  ;
}

.el-dropdown-link {
  cursor: pointer;
  color: #409EFF;
}
</style>
