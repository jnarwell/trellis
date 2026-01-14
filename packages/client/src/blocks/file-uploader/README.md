# FileUploaderBlock

A file upload block with drag-and-drop support, file validation, and progress tracking.

## Usage

```yaml
- type: file-uploader
  config:
    entityId: $route.params.id
    accept: "image/*,.pdf"
    multiple: true
    maxSize: 10485760  # 10MB
    maxFiles: 5
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `entityId` | `EntityId` | - | Entity to attach uploaded files to |
| `entityType` | `string` | - | Entity type for creating new attachment entities |
| `accept` | `string` | - | Accepted file types (e.g., `"image/*"`, `".pdf,.doc"`) |
| `multiple` | `boolean` | `false` | Allow multiple file uploads |
| `maxSize` | `number` | - | Maximum file size in bytes |
| `maxFiles` | `number` | - | Maximum number of files |
| `uploadEndpoint` | `string` | `/api/files` | Custom upload endpoint |
| `onUpload` | `object` | - | Action after successful upload |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `uploadStarted` | `{ files: File[] }` | Upload batch started |
| `uploadProgress` | `{ fileId, progress }` | Upload progress update |
| `uploadComplete` | `{ fileId, result: UploadResult }` | Single file upload complete |
| `uploadError` | `{ fileId, error: Error }` | Upload failed |
| `uploadCancelled` | `{ fileId }` | Upload was cancelled |
| `allUploadsComplete` | `{ results: UploadResult[] }` | All files in batch complete |
| `validationError` | `{ file, reason }` | File validation failed |

## Required Server API

The FileUploaderBlock requires the following API endpoint:

### POST /api/files

Upload a file and attach it to an entity.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: The file binary
  - `entityId`: (optional) Entity ID to attach to

**Response:**
```json
{
  "id": "file_abc123",
  "url": "/files/file_abc123/image.png",
  "filename": "image.png",
  "size": 1024,
  "mimeType": "image/png",
  "entityId": "ent_xyz789"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid file or missing required fields
- `413 Payload Too Large`: File exceeds server limit
- `415 Unsupported Media Type`: File type not allowed

## Example Implementation (Fastify)

```typescript
import { FastifyPluginAsync } from 'fastify';
import multipart from '@fastify/multipart';

const fileRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  });

  fastify.post('/api/files', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    const buffer = await data.toBuffer();
    const entityId = data.fields.entityId?.value;

    // Save file to storage (S3, local, etc.)
    const fileRecord = await saveFile({
      filename: data.filename,
      mimeType: data.mimetype,
      size: buffer.length,
      data: buffer,
      entityId,
    });

    return {
      id: fileRecord.id,
      url: fileRecord.url,
      filename: fileRecord.filename,
      size: fileRecord.size,
      mimeType: fileRecord.mimeType,
      entityId: fileRecord.entityId,
    };
  });
};
```
