import { router } from '@inertiajs/vue3'
import type { SearchResult } from '@/types'

/**
 * 搜索API请求参数接口
 */
export interface SearchApiParams {
  query: string
  types?: Array<'page' | 'order' | 'product' | 'user' | 'setting'>
  limit?: number
  include_suggestions?: boolean
}

/**
 * 搜索API响应接口
 */
export interface SearchApiResponse {
  success: boolean
  message?: string
  data?: {
    query: string
    results: Array<{
      type: string
      type_label: string
      items: SearchResult[]
      count: number
    }>
    total: number
    suggestions: string[]
    search_time: number
    timestamp: string
  }
  error_code?: string
  errors?: Record<string, string[]>
}

/**
 * API错误类型
 */
export class SearchApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public errors?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'SearchApiError'
  }
}

/**
 * 搜索API服务类
 * 
 * 功能特性：
 * - Inertia.js集成的异步搜索请求
 * - 完整的错误处理和重试机制
 * - TypeScript类型安全
 * - 请求取消支持
 * - 自动错误分类和处理
 */
export class SearchApiService {
  private static readonly DEFAULT_TIMEOUT = 10000 // 10秒超时
  private static readonly MAX_RETRIES = 2
  
  /**
   * 执行全局搜索
   */
  static async globalSearch(
    params: SearchApiParams,
    options: {
      timeout?: number
      retries?: number
      signal?: AbortSignal
    } = {}
  ): Promise<SearchResult[]> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.MAX_RETRIES,
      signal
    } = options

    // 参数验证
    this.validateSearchParams(params)

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.makeSearchRequest(params, { timeout, signal })
        return this.processSearchResponse(response)
        
      } catch (error) {
        lastError = error as Error
        
        // 如果是用户取消或不可重试的错误，直接抛出
        if (signal?.aborted || this.isNonRetryableError(error)) {
          throw error
        }
        
        // 最后一次尝试失败，抛出错误
        if (attempt === retries) {
          break
        }
        
        // 等待一段时间后重试 (指数退避)
        await this.delay(Math.pow(2, attempt) * 1000)
      }
    }
    
    throw lastError || new SearchApiError('搜索请求失败')
  }

  /**
   * 发起搜索请求（使用fetch，更适合API调用）
   */
  private static async makeSearchRequest(
    params: SearchApiParams,
    options: { timeout: number; signal?: AbortSignal }
  ): Promise<SearchApiResponse> {
    const controller = new AbortController()
    const combinedSignal = this.combineAbortSignals([options.signal, controller.signal].filter(Boolean))

    // 设置超时
    const timeoutId = setTimeout(() => controller.abort(), options.timeout)

    try {
      const response = await fetch(route('api.search'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': this.getCsrfToken(),
        },
        body: JSON.stringify(params),
        signal: combinedSignal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        if (response.status === 422) {
          const errorData = await response.json()
          throw new SearchApiError(
            errorData.message || '请求参数无效',
            'VALIDATION_ERROR',
            422,
            errorData.errors
          )
        }
        
        throw new SearchApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          response.status
        )
      }

      const data: SearchApiResponse = await response.json()
      return data

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof SearchApiError) {
        throw error
      }
      
      if (combinedSignal.aborted) {
        throw new SearchApiError('搜索请求已取消', 'CANCELLED')
      }
      
      throw new SearchApiError(
        '网络请求失败',
        'NETWORK_ERROR'
      )
    }
  }


  /**
   * 处理搜索响应
   */
  private static processSearchResponse(response: SearchApiResponse): SearchResult[] {
    if (!response.success) {
      throw new SearchApiError(
        response.message || '搜索失败',
        response.error_code,
        undefined,
        response.errors
      )
    }

    if (!response.data) {
      throw new SearchApiError('响应数据格式错误', 'INVALID_RESPONSE')
    }

    // 扁平化搜索结果
    const results: SearchResult[] = []
    
    response.data.results.forEach(group => {
      group.items.forEach(item => {
        results.push({
          ...item,
          type_label: group.type_label
        })
      })
    })

    return results
  }

  /**
   * 验证搜索参数
   */
  private static validateSearchParams(params: SearchApiParams): void {
    if (!params.query || typeof params.query !== 'string') {
      throw new SearchApiError('搜索关键词不能为空', 'INVALID_PARAMS')
    }

    if (params.query.length > 100) {
      throw new SearchApiError('搜索关键词过长', 'INVALID_PARAMS')
    }

    if (params.limit && (params.limit < 1 || params.limit > 50)) {
      throw new SearchApiError('搜索结果数量限制无效', 'INVALID_PARAMS')
    }

    if (params.types && !Array.isArray(params.types)) {
      throw new SearchApiError('搜索类型参数无效', 'INVALID_PARAMS')
    }
  }

  /**
   * 判断是否为不可重试的错误
   */
  private static isNonRetryableError(error: any): boolean {
    if (error instanceof SearchApiError) {
      return [
        'CANCELLED',
        'INVALID_PARAMS',
        'VALIDATION_ERROR',
        'INVALID_RESPONSE'
      ].includes(error.code || '')
    }
    
    return false
  }

  /**
   * 合并多个AbortSignal
   */
  private static combineAbortSignals(signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController()
    
    signals.forEach(signal => {
      if (signal.aborted) {
        controller.abort()
      } else {
        signal.addEventListener('abort', () => controller.abort())
      }
    })
    
    return controller.signal
  }

  /**
   * 获取CSRF Token
   */
  private static getCsrfToken(): string {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (!token) {
      throw new SearchApiError('CSRF token not found', 'CSRF_ERROR')
    }
    return token
  }

  /**
   * 延迟函数
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * 搜索API组合式函数
 * 提供响应式的搜索API接口
 */
export function useSearchApi() {
  /**
   * 执行搜索
   */
  const search = async (
    params: SearchApiParams,
    options?: {
      timeout?: number
      retries?: number
      signal?: AbortSignal
    }
  ): Promise<SearchResult[]> => {
    return SearchApiService.globalSearch(params, options)
  }

  return {
    search,
    SearchApiError
  }
}