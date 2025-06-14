# MES认证系统 API文档

本文档描述了MES（制造执行系统）认证系统的API端点，包括用户认证、权限管理和令牌操作。

## 🔑 认证说明

系统使用Laravel Sanctum进行API认证，支持基于令牌的无状态认证。所有需要认证的请求都需要在请求头中携带Bearer Token。

### 认证流程
1. 用户通过邮箱/工号/手机号 + 密码登录
2. 系统验证凭据并生成访问令牌
3. 客户端在后续请求中携带此令牌
4. 系统验证令牌有效性并执行权限检查

---

## 🚀 认证端点

### 1. 用户登录

**端点**: `POST /api/auth/login`  
**描述**: 用户认证并获取访问令牌  
**认证**: 无需认证

#### 请求参数
```json
{
  "user": "用户邮箱/工号/手机号",
  "password": "用户密码",  
  "device_name": "设备名称（可选，默认'default'）",
  "remember": false
}
```

#### 请求示例
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "user": "admin@example.com",
    "password": "password",
    "device_name": "Web Browser"
  }'
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "name": "管理员",
      "email": "admin@example.com",
      "work_no": "ADMIN001",
      "phone": "13800138000",
      "status": "active",
      "current_team_id": 1,
      "permissions": [
        "view_users",
        "create_users",
        "edit_users",
        "delete_users"
      ]
    },
    "token": "1|abc123def456...",
    "expires_at": "2025-07-01T00:00:00.000000Z",
    "token_type": "Bearer"
  }
}
```

#### 错误响应

**认证失败 (401)**
```json
{
  "success": false,
  "message": "邮箱/工号/手机号或密码错误",
  "errors": {
    "login": ["认证失败"]
  }
}
```

**账户被禁用 (403)**
```json
{
  "success": false,
  "message": "账户已被禁用",
  "errors": {
    "login": ["账户状态异常"]
  }
}
```

**数据验证失败 (422)**
```json
{
  "success": false,
  "message": "The given data was invalid.",
  "errors": {
    "user": ["用户名称字段是必需的。"],
    "password": ["密码字段是必需的。"]
  }
}
```

### 2. 获取当前用户信息

**端点**: `GET /api/auth/user`  
**描述**: 获取当前认证用户的详细信息  
**认证**: 需要Bearer Token

#### 请求头
```bash
Authorization: Bearer 1|abc123def456...
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "获取用户信息成功",
  "data": {
    "id": 1,
    "name": "管理员",
    "email": "admin@example.com",
    "work_no": "ADMIN001",
    "phone": "13800138000",
    "avatar": "https://example.com/avatars/admin.jpg",
    "status": "active",
    "current_team_id": 1,
    "last_login_at": "2025-01-10T08:30:00.000000Z",
    "last_login_ip": "192.168.1.100",
    "permissions": [
      "view_users",
      "create_users",
      "edit_users",
      "delete_users",
      "view_teams",
      "create_teams"
    ],
    "teams": [
      {
        "id": 1,
        "name": "开发团队",
        "description": "系统开发团队"
      },
      {
        "id": 2,
        "name": "测试团队", 
        "description": "系统测试团队"
      }
    ]
  }
}
```

#### 错误响应

**未认证 (401)**
```json
{
  "success": false,
  "message": "用户未认证",
  "errors": []
}
```

### 3. 用户登出（当前设备）

**端点**: `POST /api/auth/logout`  
**描述**: 登出当前设备，删除当前访问令牌  
**认证**: 需要Bearer Token

#### 请求头
```bash
Authorization: Bearer 1|abc123def456...
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "登出成功"
}
```

### 4. 用户登出（所有设备）

**端点**: `POST /api/auth/logout-all`  
**描述**: 登出所有设备，删除用户的所有访问令牌  
**认证**: 需要Bearer Token

#### 请求头
```bash
Authorization: Bearer 1|abc123def456...
```

#### 成功响应 (200)
```json
{
  "success": true,
  "message": "全部登出成功"
}
```

---

## 📄 响应格式

### 标准成功响应
```json
{
  "success": true,
  "message": "操作成功描述",
  "data": {
    // 响应数据
  }
}
```

### 标准错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "errors": {
    "字段名": ["错误详情"]
  }
}
```

---

## ⚠️ 错误代码

| HTTP状态码 | 错误类型 | 描述 |
|------------|----------|------|
| 400 | Bad Request | 请求格式错误或参数无效 |
| 401 | Unauthorized | 未认证或Token无效 |
| 403 | Forbidden | 已认证但权限不足 |
| 404 | Not Found | 请求的资源不存在 |
| 422 | Unprocessable Entity | 数据验证失败 |
| 429 | Too Many Requests | 请求频率超限 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | 服务暂时不可用 |

### 常见错误示例

#### 未认证访问
```json
{
  "message": "Unauthenticated."
}
```

#### 权限不足
```json
{
  "success": false,
  "message": "权限不足",
  "errors": {
    "permission": ["需要相应权限"]
  }
}
```

#### Token过期
```json
{
  "message": "Token has expired."
}
```

---

## 💡 使用示例

### JavaScript/Axios 示例

#### 用户登录
```javascript
const login = async (credentials) => {
  try {
    const response = await axios.post('/api/auth/login', {
      user: credentials.email,
      password: credentials.password,
      device_name: 'Web Browser',
      remember: false
    });
    
    // 保存Token
    localStorage.setItem('token', response.data.data.token);
    
    return response.data;
  } catch (error) {
    console.error('登录失败:', error.response.data);
    throw error;
  }
};
```

#### 获取用户信息
```javascript
const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await axios.get('/api/auth/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('获取用户信息失败:', error.response.data);
    throw error;
  }
};
```

### cURL 示例

#### 用户登录
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "user": "admin@example.com",
    "password": "password",
    "device_name": "cURL Client"
  }'
```

#### 获取用户信息
```bash
curl -X GET http://localhost:8000/api/auth/user \
  -H "Accept: application/json" \
  -H "Authorization: Bearer 1|abc123def456..."
```

---

## 🔧 开发提示

### Token 管理最佳实践
1. **安全存储**: 在前端使用httpOnly cookie或安全的localStorage
2. **自动刷新**: 实现Token自动刷新机制
3. **错误处理**: 统一处理401错误，自动跳转登录页
4. **设备管理**: 为不同设备使用描述性的device_name

### 权限检查
1. **前端预检**: 根据用户权限隐藏/显示UI元素
2. **后端验证**: 所有API调用都在后端进行权限验证
3. **错误处理**: 优雅处理403权限不足错误

---

**最后更新**: 2025-01-10
**API版本**: v1.0 