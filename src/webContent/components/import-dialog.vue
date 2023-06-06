<template>
  <el-dialog
    append-to-body
    title="导入配置文件"
    :visible="value"
  >
    <div style="text-align: center;">
      <input
        type="file"
        @change="handleFileSelect"
      >
    </div>
    <div
      slot="footer"
      class="dialog-footer"
    >
      <el-button @click="closeDialog">
        取 消
      </el-button>
      <el-button
        type="primary"
        @click="handleMerge"
      >
        确 定
      </el-button>
    </div>
  </el-dialog>
</template>

<script>
import {
  saveStorage,
  AJAX_INTERCEPTOR_CURRENT_PROJECT,
  AJAX_INTERCEPTOR_PROJECTS,
} from '@/store'
import { validProjectList, mergeProject } from './validate'
import { Message } from 'element-ui';

export default {
  props: {
    value: {
      type: Boolean
    }
  },
  data() {
    return {
      importJson: [],
      jsonList: []
    }
  },
  methods: {
    handleFileSelect(event) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        const content = reader.result;

        try {
          const jsonData = JSON.parse(content);
          console.log(jsonData);
          this.jsonList = [...jsonData]
          // 在这里可以对jsonData进行处理
        } catch (error) {
          console.error('解析JSON出错:', error);
        }
      };

      reader.readAsText(file);
    },
    closeDialog() {
      this.$emit("input", false);
    },
    handleChange(file) {
      const reader = new FileReader()
      reader.readAsText(file?.raw, 'utf-8')
      reader.onload = function () {
        const json = JSON.parse(reader.result)
        console.log('json',json)
        this.importJson = json
        this.jsonList = [...json]
        console.log('this.importJson',this.importJson)
      }
    },

    handleMerge() {
       console.log('this.jsonList',this.jsonList)
        chrome.storage.local.get(
        [AJAX_INTERCEPTOR_PROJECTS, AJAX_INTERCEPTOR_CURRENT_PROJECT],
        (result) => {
          const projectList = result[AJAX_INTERCEPTOR_PROJECTS] || []
          try {
            const importJson = [...this.jsonList]
            console.log('importJson',importJson)
            const newProjects = mergeProject(projectList, importJson)
            saveStorage(AJAX_INTERCEPTOR_PROJECTS, newProjects)
            location.reload()
            this.closeDialog()
          } catch (err) {
            Message({ type: 'error', message: '导入的文件不符合 Just Mock 插件规格' });
          }

        }
      )
    }
  }
};
</script>

