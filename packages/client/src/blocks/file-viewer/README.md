# FileViewerBlock

A file viewer block with grid/list layouts, inline previews, and download support.

## Usage

```yaml
- type: file-viewer
  config:
    entityId: $route.params.id
    layout: grid
    showDownload: true
    previewable:
      - "image/*"
      - "application/pdf"
```

## Configuration

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `entityId` | `EntityId` | - | Entity to show files for |
| `files` | `FileInfo[]` | - | Explicit list of files to display |
| `layout` | `'grid' \| 'list'` | `'grid'` | Display layout mode |
| `previewable` | `string[]` | `['image/*', 'application/pdf']` | MIME types to preview inline |
| `showDownload` | `boolean` | `true` | Show download button |
| `showDelete` | `boolean` | `false` | Show delete button |
| `onSelect` | `object` | `{ action: 'preview' }` | Action when file is clicked |
| `filesEndpoint` | `string` | `/api/files` | Custom files API endpoint |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `fileSelected` | `{ file: FileInfo }` | File was clicked (when `onSelect.action: 'emit'`) |
| `fileDownloaded` | `{ file: FileInfo }` | File download triggered |
| `fileDeleted` | `{ file: FileInfo }` | File was deleted |
| `previewOpened` | `{ file: FileInfo }` | Preview modal opened |
| `previewClosed` | `{ file: FileInfo }` | Preview modal closed |
| `filesLoaded` | `{ files: FileInfo[] }` | Files loaded from API |
| `error` | `{ error: Error }` | Error occurred |

## Required Server API

The FileViewerBlock requires the following API endpoints:

### GET /api/files

List files for an entity.

**Query Parameters:**
- `entityId`: Entity ID to get files for

**Response:**
```json
[
  {
    "id": "file_abc123",
    "url": "/files/file_abc123/image.png",
    "filename": "image.png",
    "size": 1024,
    "mimeType": "image/png",
    "thumbnailUrl": "/files/file_abc123/thumb.png",
    "createdAt": "2024-01-15T10:30:00Z",
    "entityId": "ent_xyz789"
  }
]
```

### DELETE /api/files/:id

Delete a file.

**Parameters:**
- `id`: File ID to delete

**Response:**
- `204 No Content`: File deleted successfully
- `404 Not Found`: File not found

## FileInfo Type

```typescript
interface FileInfo {
  id: string;
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  thumbnailUrl?: string;
  createdAt?: string;
  entityId?: EntityId;
}
```

## Example Implementation (Fastify)

```typescript
import { FastifyPluginAsync } from 'fastify';

const fileRoutes: FastifyPluginAsync = async (fastify) => {
  // List files for an entity
  fastify.get('/api/files', async (request, reply) => {
    const { entityId } = request.query as { entityId?: string };

    const files = await db.files.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((file) => ({
      id: file.id,
      url: `/files/${file.id}/${file.filename}`,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimeType,
      thumbnailUrl: file.thumbnailId
        ? `/files/${file.thumbnailId}/thumb.png`
        : undefined,
      createdAt: file.createdAt.toISOString(),
      entityId: file.entityId,
    }));
  });

  // Delete a file
  fastify.delete('/api/files/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const file = await db.files.findUnique({ where: { id } });
    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    // Delete from storage
    await deleteFromStorage(file.storageKey);

    // Delete from database
    await db.files.delete({ where: { id } });

    return reply.status(204).send();
  });

  // Serve file content
  fastify.get('/files/:id/:filename', async (request, reply) => {
    const { id } = request.params as { id: string };

    const file = await db.files.findUnique({ where: { id } });
    if (!file) {
      return reply.status(404).send({ error: 'File not found' });
    }

    const stream = await getFileStream(file.storageKey);

    return reply
      .type(file.mimeType)
      .header('Content-Disposition', `inline; filename="${file.filename}"`)
      .send(stream);
  });
};
```

## Layout Examples

### Grid Layout
Best for visual files like images. Shows thumbnails in a responsive grid.

### List Layout
Best for documents. Shows filename, size, and type in a compact list format.
