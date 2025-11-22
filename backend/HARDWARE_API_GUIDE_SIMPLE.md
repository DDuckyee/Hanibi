# 하드웨어사 Camera API 가이드

**서버 주소**: `http://43.200.77.84:3000`

---

## ■ 1단계: 카메라 등록 (최초 1회)

기존 방식과 동일하게 JSON POST로 등록합니다.

### [API 정보]

- **Method**: POST
- **URL**: `http://43.200.77.84:3000/api/v1/cameras`
- **Content-Type**: `application/json`

### [요청 예시]

```json
{
  "deviceId": "ETCOM-001",
  "rtspUrl": "rtsp://admin3:12345678@221.159.164.177:8891/stream1"
}
```

### [필수 값]

- **deviceId**: 하드웨어 고유 ID
- **rtspUrl**: 카메라 RTSP URL (형식: `rtsp://아이디:비번@IP주소:포트/경로`)

### [선택 값]

- **cameraModel**: 카메라 모델명
- **username**: 카메라 인증 사용자명
- **password**: 카메라 인증 비밀번호

### [성공 응답 예시]

```json
{
  "success": true,
  "data": {
    "deviceId": "ETCOM-001",
    "rtspUrl": "rtsp://admin3:12345678@221.159.164.177:8891/stream1",
    "connectionStatus": "ONLINE",
    "lastConnectedAt": "2025-11-22T20:06:47.454Z"
  }
}
```

---

## ■ 2단계: 스냅샷 캡처 및 전송 (캡처할 때마다)

**⚠️ 중요**: `multipart/form-data` 형식으로 요청하며, **이미지 파일을 반드시 포함**해야 합니다.

### [API 정보]

- **Method**: POST
- **URL**: `http://43.200.77.84:3000/api/v1/cameras/{deviceId}/capture`
- **Content-Type**: `multipart/form-data`

### [URL 파라미터]

- **{deviceId}**: 디바이스 ID (예: `ETCOM-001`)

### [요청 예시]

**cURL 예시:**
```bash
curl -X POST "http://43.200.77.84:3000/api/v1/cameras/ETCOM-001/capture" \
  -F "triggerType=FOOD_INPUT_BEFORE" \
  -F "image=@/path/to/image.jpg"
```

**Python 예시:**
```python
import requests

url = "http://43.200.77.84:3000/api/v1/cameras/ETCOM-001/capture"
files = {
    'image': ('image.jpg', open('image.jpg', 'rb'), 'image/jpeg')
}
data = {
    'triggerType': 'FOOD_INPUT_BEFORE'
}
response = requests.post(url, files=files, data=data)
print(response.json())
```

### [필수 값]

- **triggerType**: `FOOD_INPUT_BEFORE` (음식 투입 전) 또는 `FOOD_INPUT_AFTER` (음식 투입 후)
- **image**: 이미지 파일 (JPG 형식 권장)

**참고**: 캡처 시각은 서버에서 자동으로 측정됩니다. 하드웨어에서 시간을 보낼 필요가 없습니다.

### [성공 응답 예시]

```json
{
  "success": true,
  "data": {
    "snapshotId": "snapshot-1763842017131",
    "deviceId": "ETCOM-001",
    "snapshotType": "FOOD_INPUT_BEFORE",
    "imageUrl": "/snapshots/ETCOM-001/1763842017131.jpg",
    "capturedAt": "2025-11-22T20:06:57.131Z",
    "latencyMs": 119
  }
}
```

---

## ■ 3단계: 이미지 업로드 확인

### [방법 1] 스냅샷 목록 조회

### [API 정보]

- **Method**: GET
- **URL**: `http://43.200.77.84:3000/api/v1/cameras/{deviceId}/snapshots`
- **Content-Type**: 없음

### [URL 파라미터]

- **{deviceId}**: 디바이스 ID (예: `ETCOM-001`)

### [쿼리 파라미터 (선택사항)]

- **limit**: 조회할 개수 (기본값: 20, 최대: 100)
- **from**: 시작 날짜 (ISO 8601 형식, 예: `2025-11-22T00:00:00.000Z`)
- **to**: 종료 날짜 (ISO 8601 형식, 예: `2025-11-22T23:59:59.999Z`)

### [요청 예시]

```
GET http://43.200.77.84:3000/api/v1/cameras/ETCOM-001/snapshots?limit=10
```

### [성공 응답 예시]

```json
{
  "success": true,
  "data": [
    {
      "snapshotId": "snapshot-1763842019295",
      "deviceId": "ETCOM-001",
      "snapshotType": "FOOD_INPUT_AFTER",
      "imageUrl": "/snapshots/ETCOM-001/1763842019295.jpg",
      "capturedAt": "2025-11-22T20:06:59.295Z",
      "latencyMs": 367
    },
    {
      "snapshotId": "snapshot-1763842017131",
      "deviceId": "ETCOM-001",
      "snapshotType": "FOOD_INPUT_BEFORE",
      "imageUrl": "/snapshots/ETCOM-001/1763842017131.jpg",
      "capturedAt": "2025-11-22T20:06:57.131Z",
      "latencyMs": 119
    }
  ]
}
```

### [방법 2] 이미지 직접 접근 URL

스냅샷 목록 조회 API의 응답에서 `snapshotId`를 확인한 후, 아래 URL로 이미지에 직접 접근할 수 있습니다.

### [URL 형식]

```
http://43.200.77.84:3000/api/v1/cameras/{deviceId}/snapshots/{snapshotId}/image
```

### [요청 예시]

```
http://43.200.77.84:3000/api/v1/cameras/ETCOM-001/snapshots/snapshot-1763842017131/image
```

**사용 방법**: 위 URL을 브라우저 주소창에 입력하면 이미지를 바로 볼 수 있습니다.

---

## ■ 에러 응답 예시

### [필수 필드 누락]

```json
{
  "statusCode": 400,
  "message": "triggerType은 필수입니다.",
  "error": "Bad Request"
}
```

### [이미지 파일 누락]

```json
{
  "statusCode": 400,
  "message": "이미지 파일은 필수입니다.",
  "error": "Bad Request"
}
```

### [잘못된 triggerType]

```json
{
  "statusCode": 400,
  "message": "triggerType은 FOOD_INPUT_BEFORE, FOOD_INPUT_AFTER 중 하나여야 합니다.",
  "error": "Bad Request"
}
```

### [카메라 미등록]

```json
{
  "statusCode": 404,
  "message": "deviceId=ETCOM-001 카메라가 등록되지 않았습니다.",
  "error": "Not Found"
}
```

### [존재하지 않는 deviceId (스냅샷 목록 조회)]

```json
{
  "statusCode": 404,
  "message": "deviceId=INVALID-999 디바이스를 찾을 수 없습니다.",
  "error": "Not Found"
}
```

---

## ■ 전체 흐름 요약

1. **하드웨어 시작** → 카메라 등록 (최초 1회)
2. **카메라에서 이미지 캡처** → 스냅샷 전송 (캡처할 때마다)
3. **서버 응답 확인** → `snapshotId` 확인
4. **이미지 확인** → 스냅샷 목록 조회 또는 이미지 URL로 직접 접근

---

## ■ 주의사항

1. **이미지 파일은 반드시 포함해야 합니다**
   - `multipart/form-data` 형식으로 요청
   - 파일 필드명은 `image`
   - JPG 형식 권장

2. **캡처 시각은 서버에서 자동으로 측정됩니다**
   - 하드웨어에서 시간을 보낼 필요가 없습니다

3. **인증이 필요 없습니다**
   - JWT 토큰이나 API 키 불필요


