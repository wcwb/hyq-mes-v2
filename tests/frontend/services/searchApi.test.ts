import { describe, it, expect, beforeEach, vi, beforeAll, afterEach } from 'vitest'
import { SearchApiService, SearchApiError, type SearchApiParams } from '@/services/searchApi'

// Mock global route function
const mockRoute = vi.fn((name: string) => `/api/search`)
global.route = mockRoute

// Mock fetch globally
global.fetch = vi.fn()

// Mock CSRF token
Object.defineProperty(document, 'querySelector', {
  value: vi.fn(() => ({
    getAttribute: vi.fn(() => 'test-csrf-token')
  })),
  configurable: true
})

describe('SearchApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('参数验证', () => {
    it('应该验证有效的搜索参数', () => {
      const validParams: SearchApiParams = {
        query: 'test query',
        types: ['page', 'order'],
        limit: 10
      }

      expect(() => {
        ;(SearchApiService as any).validateSearchParams(validParams)
      }).not.toThrow()
    })

    it('应该拒绝空查询', () => {
      const invalidParams: SearchApiParams = {
        query: ''
      }

      expect(() => {
        ;(SearchApiService as any).validateSearchParams(invalidParams)
      }).toThrow(SearchApiError)
    })

    it('应该拒绝过长的查询', () => {
      const invalidParams: SearchApiParams = {
        query: 'a'.repeat(101)
      }

      expect(() => {
        ;(SearchApiService as any).validateSearchParams(invalidParams)
      }).toThrow(SearchApiError)
    })

    it('应该验证搜索结果限制', () => {
      const invalidParams: SearchApiParams = {
        query: 'test',
        limit: 100
      }

      expect(() => {
        ;(SearchApiService as any).validateSearchParams(invalidParams)
      }).toThrow(SearchApiError)
    })
  })

  describe('API请求', () => {
    it('应该成功处理有效的API响应', async () => {
      const mockResponse = {
        success: true,
        data: {
          query: 'test',
          results: [
            {
              type: 'page',
              type_label: '页面',
              items: [
                {
                  id: 'test-1',
                  type: 'page',
                  title: '测试页面',
                  description: '测试描述',
                  url: '/test'
                }
              ],
              count: 1
            }
          ],
          total: 1,
          suggestions: [],
          search_time: 0.1,
          timestamp: new Date().toISOString()
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const results = await SearchApiService.globalSearch({
        query: 'test'
      })

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('测试页面')
      expect(results[0].type_label).toBe('页面')
    })

    it('应该处理API错误响应', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({
          success: false,
          message: '参数无效',
          errors: { query: ['查询不能为空'] }
        })
      })

      await expect(SearchApiService.globalSearch({
        query: 'test'
      })).rejects.toThrow(SearchApiError)
    })

    it('应该处理网络错误', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(SearchApiService.globalSearch({
        query: 'test'
      })).rejects.toThrow(SearchApiError)
    })

    it('应该支持请求取消', async () => {
      const controller = new AbortController()
      
      ;(global.fetch as any).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('The operation was aborted'))
          }, 100)
        })
      })

      // 立即取消请求
      controller.abort()

      await expect(SearchApiService.globalSearch({
        query: 'test'
      }, { signal: controller.signal })).rejects.toThrow(SearchApiError)
    }, 1000)

    it('应该实现重试机制', async () => {
      let callCount = 0
      ;(global.fetch as any).mockImplementation(() => {
        callCount++
        if (callCount < 2) {
          return Promise.reject(new Error('Temporary error'))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              query: 'test',
              results: [],
              total: 0,
              suggestions: [],
              search_time: 0.1,
              timestamp: new Date().toISOString()
            }
          })
        })
      })

      const results = await SearchApiService.globalSearch({
        query: 'test'
      }, { retries: 2 })

      expect(callCount).toBe(2)
      expect(results).toEqual([])
    })
  })

  describe('错误分类', () => {
    it('应该正确识别不可重试的错误', () => {
      const retryableError = new Error('Network error')
      const nonRetryableError = new SearchApiError('Invalid params', 'INVALID_PARAMS')

      expect((SearchApiService as any).isNonRetryableError(retryableError)).toBe(false)
      expect((SearchApiService as any).isNonRetryableError(nonRetryableError)).toBe(true)
    })
  })

  describe('工具方法', () => {
    it('应该正确合并AbortSignal', () => {
      const controller1 = new AbortController()
      const controller2 = new AbortController()

      const combined = (SearchApiService as any).combineAbortSignals([
        controller1.signal,
        controller2.signal
      ])

      expect(combined.aborted).toBe(false)

      controller1.abort()
      expect(combined.aborted).toBe(true)
    })

    it('应该获取CSRF token', () => {
      const token = (SearchApiService as any).getCsrfToken()
      expect(token).toBe('test-csrf-token')
    })
  })

  describe('响应处理', () => {
    it('应该正确扁平化搜索结果', () => {
      const response = {
        success: true,
        data: {
          query: 'test',
          results: [
            {
              type: 'page',
              type_label: '页面',
              items: [
                { id: '1', type: 'page', title: '页面1' },
                { id: '2', type: 'page', title: '页面2' }
              ],
              count: 2
            },
            {
              type: 'order',
              type_label: '订单',
              items: [
                { id: '3', type: 'order', title: '订单1' }
              ],
              count: 1
            }
          ],
          total: 3,
          suggestions: [],
          search_time: 0.1,
          timestamp: new Date().toISOString()
        }
      }

      const results = (SearchApiService as any).processSearchResponse(response)

      expect(results).toHaveLength(3)
      expect(results[0].type_label).toBe('页面')
      expect(results[2].type_label).toBe('订单')
    })

    it('应该处理无效的响应格式', () => {
      const invalidResponse = {
        success: false,
        message: '搜索失败'
      }

      expect(() => {
        ;(SearchApiService as any).processSearchResponse(invalidResponse)
      }).toThrow(SearchApiError)
    })
  })
})