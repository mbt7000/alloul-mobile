# Global Platforms Configuration Panel — Frontend Guide

## 🎯 Overview

**Location:** `/workspace/settings/platforms`  
**Purpose:** Manage API keys, test connections, and enable/disable integrations

## 📐 UI Structure

```
┌─ Settings Header
│  └─ "Platforms & Integrations" breadcrumb
│
├─ Filter/Sort Bar
│  ├─ Category Filter (AI, Communication, CRM, Payments)
│  ├─ Status Filter (Configured, Active, Unconfigured)
│  └─ Search box
│
└─ Platforms Grid/List
   ├─ Platform Card 1
   │  ├─ Platform Icon + Name
   │  ├─ Status Badge (🟢 Configured / 🔴 Unconfigured / 🟡 Error)
   │  ├─ Description
   │  ├─ Action Buttons:
   │  │  ├─ [Setup] or [Update] — opens credential form
   │  │  ├─ [Test] — validates connection
   │  │  ├─ [Deactivate] — disables without deleting
   │  │  └─ [Remove] — deletes credentials
   │  └─ Last tested / Error message
   │
   ├─ Platform Card 2
   └─ ...
```

## 🎨 Design Specifications

### Color Scheme (Glassmorphic)
- **Background:** Frosted glass (backdrop-blur: 10px, opacity: 0.8)
- **Cards:** Semi-transparent white (rgba(255, 255, 255, 0.7))
- **Status Badges:**
  - 🟢 Green (#10B981) — Configured & Active
  - 🔴 Red (#EF4444) — Error or Unconfigured
  - 🟡 Yellow (#F59E0B) — Degraded
  - ⚪ Gray (#9CA3AF) — Inactive

### Typography
- **Title:** `text-2xl font-bold text-gray-900`
- **Card Title:** `text-lg font-semibold text-gray-800`
- **Description:** `text-sm text-gray-600`
- **Error/Help Text:** `text-xs text-red-600`

### Spacing
- **Page padding:** `px-6 py-8`
- **Card gap:** `gap-4` (grid) or `space-y-4` (flex)
- **Card padding:** `p-6`

## 📱 API Integration

### Fetch Integrations
```javascript
GET /settings/integrations

Response:
{
  "integrations": [
    {
      "platform_id": "openai",
      "status": "available",
      "is_configured": true,
      "is_active": true,
      "error_message": null
    },
    ...
  ],
  "configured_count": 2,
  "available_platforms": [
    {
      "id": "openai",
      "name": "OpenAI",
      "category": "ai",
      "description": "GPT models...",
      "requires_api_key": true
    },
    ...
  ]
}
```

### Save Credentials
```javascript
POST /settings/integrations/{platform_id}

Request:
{
  "platform_id": "openai",
  "api_key": "sk-...",
  "api_secret": null,
  "custom_params": {}
}

Response: Same as request + timestamps
```

### Test Connection
```javascript
POST /settings/integrations/{platform_id}/test

Request:
{
  "platform_id": "openai",
  "api_key": "sk-...",
  "custom_params": {}
}

Response:
{
  "success": true,
  "platform_id": "openai",
  "message": "Connected to OpenAI",
  "status": "available"
}
```

### Deactivate Integration
```javascript
POST /settings/integrations/{platform_id}/deactivate

Response:
{
  "status": "deactivated",
  "platform_id": "openai"
}
```

### Delete Integration
```javascript
DELETE /settings/integrations/{platform_id}

Response: 204 No Content
```

## 🔐 Security Checklist

- [ ] API keys displayed as masked input (show last 4 chars only)
- [ ] Test button uses unsaved credentials (doesn't save if test fails)
- [ ] Confirmation dialog before deleting credentials
- [ ] Error messages don't reveal sensitive info
- [ ] HTTPS only (no HTTP for credential transmission)
- [ ] Rate-limit test button to prevent spam

## 🎭 Interaction Flow

### Adding a New Integration
1. User clicks "Setup" on unconfigured platform card
2. Modal/Drawer opens with form:
   - API Key input (password type)
   - API Secret input (if required)
   - Custom params (dynamic based on platform)
3. User clicks [Test Connection]
   - Loading spinner appears
   - If success: green checkmark + "Connection successful"
   - If fail: red error message
4. User clicks [Save]
   - Credentials saved to backend
   - Card updates to show "Configured ✓"
5. User optionally clicks [Deactivate] to disable

### Updating Existing Integration
1. User clicks [Update] on configured card
2. Form opens with existing values (masked)
3. User can update key or custom params
4. Same flow as "Adding"

## 📊 Example Implementation (React)

```tsx
// components/PlatformCard.tsx
export const PlatformCard = ({ platform, status, onSetup, onTest, onRemove }) => (
  <div className="rounded-lg bg-white/70 backdrop-blur-md p-6 border border-white/20">
    {/* Header */}
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-lg font-semibold">{platform.name}</h3>
        <p className="text-sm text-gray-600 mt-1">{platform.description}</p>
      </div>
      <StatusBadge status={status} />
    </div>

    {/* Error Message */}
    {status.error_message && (
      <div className="mt-4 p-3 bg-red-50 rounded text-sm text-red-700">
        {status.error_message}
      </div>
    )}

    {/* Action Buttons */}
    <div className="mt-6 flex gap-3">
      <Button onClick={() => onSetup(platform.id)} variant="primary">
        {status.is_configured ? 'Update' : 'Setup'}
      </Button>
      <Button onClick={() => onTest(platform.id)} variant="secondary">
        Test
      </Button>
      {status.is_configured && (
        <Button onClick={() => onRemove(platform.id)} variant="danger">
          Remove
        </Button>
      )}
    </div>
  </div>
);
```

## 🚀 Next Steps

- Implement form validation (required fields, URL format, etc.)
- Add credential encryption on client before sending
- Implement batch operations (enable/disable multiple)
- Add integration logs (who changed what, when)
- Monitor API usage per integration
