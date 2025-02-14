/* eslint-disable no-continue */
// 在页面上插入代码
import { proxy } from 'ajax-hook-botshen'
// import { stringify } from 'flatted'
import Url from 'url-parse'
import { pathToRegexp } from 'path-to-regexp'
import FetchInterceptor from '@/fetch-interceptor'
import type {
  Project,
  ProjectStorage,
  NetworkItem,
  MethodType,
  Request,
  Response,
  StatusType,
  MockResult,
} from './type'
import { Notification } from 'element-ui';


export const CUSTOM_EVENT_NAME = 'CUSTOMEVENT'
export const INJECT_ELEMENT_ID = 'ajaxInterceptor'

/**
 * 用户界面的 ajax 请求log，发给插件层
 * @param {*} msg
 */
const sendMsg = (msg: NetworkItem, isMock = false) => {
  // const str = stringify(msg)
  const result = {
    ...msg,
    isMock
  }
  const event = new CustomEvent(CUSTOM_EVENT_NAME, { detail: result })
  window.dispatchEvent(event)
}
function logTerminalMockMessage(config: any, result: any, request: any) {
  console.log(`%cURL:${request.url} METHOD:${request.method}`, 'color: red')
  if (JSON.parse(config.body)) {
    console.log('%c请求:', 'color: red;', JSON.parse(config.body))
  }
  if (JSON.parse(result.response)) {
    console.log('%c响应:', 'color: red;', JSON.parse(result.response))
  }
}
function getCurrentProject() {
  const inputElem = document.getElementById(
    INJECT_ELEMENT_ID
  ) as HTMLInputElement
  if (!inputElem) {
    return {} as Project;
  }
  const configStr = inputElem.value
  try {
    const config: ProjectStorage = JSON.parse(configStr);
    const { ajaxInterceptor_current_project, ajaxInterceptor_projects } = config
    const currentProject =
      ajaxInterceptor_projects?.find(
        (item) => item.name === ajaxInterceptor_current_project
      ) || ({} as Project)
    return currentProject;
  } catch (e) {
    return {} as Project;
  }
}
//
function mockCore(url: string, method: string): Promise<MockResult> {


  // 看下插件设置的数据结构
  const targetUrl = new Url(url)
  const str = targetUrl.pathname
  const currentProject = getCurrentProject()
  return new Promise((resolve, reject) => {
    // 进入 mock 的逻辑判断
    if (currentProject.switchOn) {
      const rules = currentProject.rules || []
      const currentRule = rules.find((item) => {
        const re = pathToRegexp(item.path) // 匹配规则
        const match1 = re.exec(str)

        return item.method === method && match1 && item.switchOn
      })

      if (currentRule) {
        setTimeout(() => {
          resolve({
            response: currentRule.response,
            path: currentRule.path,
            status: currentRule.status,
          } as MockResult)
        }, currentRule.delay || 0)

        return
      }
    }
    reject()
  })
}
function handMockResult({ res, request, config }: any) {
  const { response, path: rulePath, status } = res
  const result = {
    config,
    status,
    headers: [],
    response: JSON.stringify(response),
  }
  // FIXME: 这里的数据结构好像是错误的
  const payload: NetworkItem = {
    request,
    response: {
      status: result.status,
      headers: result.headers,
      // statusText: result.statusText,
      url: config.url,
      responseTxt: JSON.stringify(response),
      isMock: true,
      rulePath,
    },
  }
  return { result, payload }
}
proxy({
  onRequest: (config, handler) => {
    if (getCurrentProject().isRealRequest) {
      handler.next(config)
    } else {
      // TODO: url 对象里面的信息非常有用啊
      const url = new Url(config.url)

      const request: Request = {
        url: url.href,
        method: config.method as MethodType,
        headers: config.headers,
        type: 'xhr',
      }
      mockCore(url.href, config.method)
        .then((res) => {
          const { payload, result } = handMockResult({ res, request, config })
          sendMsg(payload, true)
          if (getCurrentProject().isTerminalLogOpen) {
            logTerminalMockMessage(config, result, request)
         
          }
          Notification.success({
            title: 'Mock成功',
            dangerouslyUseHTMLString: true,
            message: `<span style="word-break: break-all;width:400px; font-size:18px; color:#ee784f" >${config.url}</span>`
          })
          handler.resolve(result as any)
        })
        .catch(() => {
          handler.next(config)
        })
    }

  },
  onResponse: (response, handler) => {
    const { statusText, status, config, headers, response: res } = response
    const url = new Url(config.url)
    mockCore(url.href, config.method)
      .then((res) => {
        const request: Request = {
          url: url.href,
          method: config.method as MethodType,
          headers: config.headers,
          type: 'xhr',
        }
        const { payload, result } = handMockResult({ res, request, config })
        sendMsg(payload, true)
        if (getCurrentProject().isTerminalLogOpen) {
          logTerminalMockMessage(config, result, request)
        }
        handler.resolve(result as any)
      })
      .catch(() => {
        const url = new Url(config.url)
        const payload: NetworkItem = {
          request: {
            method: config.method as MethodType,
            url: url.href,
            headers: config.headers,
            type: 'xhr',
          },
          response: {
            status: status as StatusType,
            statusText,
            url: config.url,
            headers: headers,
            responseTxt: res,
            isMock: false,
            rulePath: '',
          },
        }
        sendMsg(payload)
        handler.resolve(response)
      })

  },
})

if (window.fetch !== undefined) {
  FetchInterceptor.register({
    onBeforeRequest(request: globalThis.Request) {
      return mockCore(request.url, request.method).then((res) => {
        try {
          const { path: rulePath } = res
          const text = JSON.stringify(res.response)
          const response: any = new Response()
          response.json = () => Promise.resolve(res.response)
          response.text = () => Promise.resolve(text)
          response.isMock = true
          response.rulePath = rulePath
          return response
        } catch (err) {
          console.error(err)
        }
      })
    },
    onRequestSuccess(
      response: globalThis.Response | any,
      request: globalThis.Request | any
    ) {
      const payload: NetworkItem = {
        request: {
          type: 'fetch',
          method: request.method as MethodType,
          url: request.url,
          headers: request.headers,
        },
        response: {
          status: response.status as StatusType,
          statusText: response.statusText,
          url: response.url,
          headers: response.headers,
          responseTxt: '',
          isMock: false,
          rulePath: '',
        },
      }

      // TODO: 数据格式化，流是不能直接转成字符串的, 如何获取到 response 中的字符串返回
      if (response.isMock) {
        response.json().then((res: any) => {
          const result: Response = {
            status: response.status as StatusType,
            url: request.url,
            headers: [],
            responseTxt: JSON.stringify(res),
            isMock: true,
            rulePath: response.rulePath,
          }
          payload.response = result
          sendMsg(payload, true)
        })
      } else {
        const cloneRes = response.clone()
        cloneRes.json().then((res: any) => {
          const result: Response = {
            status: response.status as StatusType,
            url: request.url,
            headers: [],
            responseTxt: JSON.stringify(res),
            isMock: false,
            rulePath: '',
          }
          payload.response = result
          sendMsg(payload)
        })
      }
    },
    onRequestFailure(response: any, request: any) {
      const payload: NetworkItem = {
        request: {
          type: 'fetch',
          method: request.method,
          url: request.url,
          headers: request.headers,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: response.headers,
          responseTxt: '',
          isMock: false,
          rulePath: '',
        },
      }

      sendMsg(payload)
    },
  }, getCurrentProject().isRealRequest)
}
