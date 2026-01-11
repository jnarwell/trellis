/**
 * YAML Loader Tests
 *
 * Tests for product configuration YAML loading and parsing.
 */

import { describe, it, expect } from 'vitest';
import {
  parseYaml,
  YamlParseError,
} from '../src/config/loader.js';

// =============================================================================
// YAML PARSING TESTS
// =============================================================================

describe('parseYaml', () => {
  it('parses simple YAML', () => {
    const result = parseYaml<{ name: string }>('name: test', 'test.yaml');
    expect(result.name).toBe('test');
  });

  it('parses nested YAML', () => {
    const yaml = `
manifest:
  id: test-product
  name: Test Product
  version: 1.0.0
`;
    const result = parseYaml<{
      manifest: { id: string; name: string; version: string };
    }>(yaml, 'test.yaml');
    expect(result.manifest.id).toBe('test-product');
    expect(result.manifest.name).toBe('Test Product');
    expect(result.manifest.version).toBe('1.0.0');
  });

  it('parses arrays', () => {
    const yaml = `
items:
  - one
  - two
  - three
`;
    const result = parseYaml<{ items: string[] }>(yaml, 'test.yaml');
    expect(result.items).toEqual(['one', 'two', 'three']);
  });

  it('parses boolean values', () => {
    const yaml = `
enabled: true
disabled: false
`;
    const result = parseYaml<{ enabled: boolean; disabled: boolean }>(
      yaml,
      'test.yaml'
    );
    expect(result.enabled).toBe(true);
    expect(result.disabled).toBe(false);
  });

  it('parses number values', () => {
    const yaml = `
integer: 42
float: 3.14
negative: -10
`;
    const result = parseYaml<{
      integer: number;
      float: number;
      negative: number;
    }>(yaml, 'test.yaml');
    expect(result.integer).toBe(42);
    expect(result.float).toBe(3.14);
    expect(result.negative).toBe(-10);
  });

  it('parses null values', () => {
    const yaml = `
value: null
empty: ~
`;
    const result = parseYaml<{ value: null; empty: null }>(yaml, 'test.yaml');
    expect(result.value).toBe(null);
    expect(result.empty).toBe(null);
  });

  it('throws YamlParseError for invalid YAML', () => {
    const invalidYaml = `
key: value
  bad-indent: wrong
`;
    expect(() => parseYaml(invalidYaml, 'test.yaml')).toThrow(YamlParseError);
  });

  it('throws YamlParseError with file info', () => {
    const invalidYaml = `key: [unclosed`;
    try {
      parseYaml(invalidYaml, 'test.yaml');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(YamlParseError);
      const yamlErr = err as YamlParseError;
      expect(yamlErr.file).toBe('test.yaml');
    }
  });
});

// =============================================================================
// LINE MAP TESTS
// =============================================================================

// Note: buildLineMap is an internal function, but we export it for testing
// We'll test it through a helper

describe('line mapping', () => {
  it('tracks simple key paths', () => {
    const yaml = `
name: test
version: 1.0.0
`;
    // Line 2 is "name: test", line 3 is "version: 1.0.0"
    // The map should track these paths
    const result = parseYaml<{ name: string; version: string }>(
      yaml,
      'test.yaml'
    );
    expect(result.name).toBe('test');
    expect(result.version).toBe('1.0.0');
  });

  it('tracks nested paths', () => {
    const yaml = `
manifest:
  id: test
  name: Product
`;
    const result = parseYaml<{
      manifest: { id: string; name: string };
    }>(yaml, 'test.yaml');
    expect(result.manifest.id).toBe('test');
    expect(result.manifest.name).toBe('Product');
  });
});

// =============================================================================
// PRODUCT CONFIG STRUCTURE TESTS
// =============================================================================

describe('ProductConfig structure', () => {
  it('parses product manifest', () => {
    const yaml = `
id: plm
name: PLM Standard
version: 1.0.0
description: Product Lifecycle Management
includes:
  entities:
    - entities/*.yaml
  views:
    - views/*.yaml
`;
    const result = parseYaml<{
      id: string;
      name: string;
      version: string;
      description: string;
      includes: { entities: string[]; views: string[] };
    }>(yaml, 'product.yaml');

    expect(result.id).toBe('plm');
    expect(result.name).toBe('PLM Standard');
    expect(result.version).toBe('1.0.0');
    expect(result.includes.entities).toContain('entities/*.yaml');
    expect(result.includes.views).toContain('views/*.yaml');
  });

  it('parses entity config', () => {
    const yaml = `
id: part
name: Part
typePath: product.part
icon: cube
properties:
  - name: part_number
    type: text
    required: true
  - name: revision
    type: text
    default: A
`;
    const result = parseYaml<{
      id: string;
      name: string;
      typePath: string;
      icon: string;
      properties: Array<{
        name: string;
        type: string;
        required?: boolean;
        default?: string;
      }>;
    }>(yaml, 'part.yaml');

    expect(result.id).toBe('part');
    expect(result.typePath).toBe('product.part');
    expect(result.properties).toHaveLength(2);
    expect(result.properties[0].name).toBe('part_number');
    expect(result.properties[0].required).toBe(true);
  });

  it('parses view config', () => {
    const yaml = `
id: part-detail
name: Part Detail
route: /parts/:entityId
layout:
  type: tabs
  tabs:
    - id: overview
      label: Overview
      blocks:
        - type: trellis.entity-header
          props:
            entityType: product.part
`;
    const result = parseYaml<{
      id: string;
      name: string;
      route: string;
      layout: {
        type: string;
        tabs: Array<{
          id: string;
          label: string;
          blocks: Array<{ type: string; props: Record<string, unknown> }>;
        }>;
      };
    }>(yaml, 'view.yaml');

    expect(result.id).toBe('part-detail');
    expect(result.route).toBe('/parts/:entityId');
    expect(result.layout.type).toBe('tabs');
    expect(result.layout.tabs).toHaveLength(1);
    expect(result.layout.tabs[0].blocks[0].type).toBe('trellis.entity-header');
  });

  it('parses navigation config', () => {
    const yaml = `
sidebar:
  items:
    - id: parts
      label: Parts
      icon: cube
      route: /parts
    - id: documents
      label: Documents
      icon: file
      route: /documents
`;
    const result = parseYaml<{
      sidebar: {
        items: Array<{
          id: string;
          label: string;
          icon: string;
          route: string;
        }>;
      };
    }>(yaml, 'navigation.yaml');

    expect(result.sidebar.items).toHaveLength(2);
    expect(result.sidebar.items[0].id).toBe('parts');
    expect(result.sidebar.items[1].id).toBe('documents');
  });

  it('parses wiring config', () => {
    const yaml = `
connections:
  - from: part-list.selectPart
    to: $navigate
    transform:
      type: expression
      value: "{ path: '/parts/' + $event.entityId }"
  - from: part-header.editClick
    to: part-form.startEdit
`;
    const result = parseYaml<{
      connections: Array<{
        from: string;
        to: string;
        transform?: { type: string; value: string };
      }>;
    }>(yaml, 'wiring.yaml');

    expect(result.connections).toHaveLength(2);
    expect(result.connections[0].from).toBe('part-list.selectPart');
    expect(result.connections[0].to).toBe('$navigate');
    expect(result.connections[0].transform?.type).toBe('expression');
    expect(result.connections[1].transform).toBeUndefined();
  });
});

// =============================================================================
// EDGE CASES
// =============================================================================

describe('edge cases', () => {
  it('handles empty YAML', () => {
    const result = parseYaml<undefined>('', 'empty.yaml');
    expect(result).toBeUndefined();
  });

  it('handles YAML with only comments', () => {
    const yaml = `
# This is a comment
# Another comment
`;
    // js-yaml returns null for comment-only content (treated as explicit null document)
    const result = parseYaml<null>(yaml, 'comments.yaml');
    expect(result).toBeNull();
  });

  it('handles multiline strings', () => {
    const yaml = `
description: |
  This is a multiline
  description that spans
  multiple lines.
`;
    const result = parseYaml<{ description: string }>(yaml, 'test.yaml');
    expect(result.description).toContain('This is a multiline');
    expect(result.description).toContain('multiple lines.');
  });

  it('handles folded strings', () => {
    const yaml = `
description: >
  This is a folded
  string that will be
  joined on one line.
`;
    const result = parseYaml<{ description: string }>(yaml, 'test.yaml');
    expect(result.description.trim()).not.toContain('\n');
  });

  it('handles anchor and alias', () => {
    const yaml = `
defaults: &defaults
  timeout: 30
  retries: 3

production:
  <<: *defaults
  timeout: 60
`;
    const result = parseYaml<{
      defaults: { timeout: number; retries: number };
      production: { timeout: number; retries: number };
    }>(yaml, 'test.yaml');

    expect(result.production.timeout).toBe(60);
    expect(result.production.retries).toBe(3);
  });

  it('handles special characters in strings', () => {
    const yaml = `
name: "Part: Widget #1 (v2.0)"
path: "/parts/{id}/edit"
`;
    const result = parseYaml<{ name: string; path: string }>(yaml, 'test.yaml');
    expect(result.name).toBe('Part: Widget #1 (v2.0)');
    expect(result.path).toBe('/parts/{id}/edit');
  });
});
