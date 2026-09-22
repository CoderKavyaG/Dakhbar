import {test} from 'node:test';
import assert from 'node:assert/strict';
import {usableArticleImage} from '../src/lib/article-image';
import {normalizeDevto} from '../src/lib/ingestion/devto';
test('tiny icons and tracking pixels never become oversized article photos',()=>{assert.equal(usableArticleImage(1,1),false);assert.equal(usableArticleImage(144,144),false);assert.equal(usableArticleImage(1200,630),true);});
test('Dev.to auto-generated headline social cards do not substitute for real cover images',()=>{const row=normalizeDevto({id:2,title:'React news',url:'https://dev.to/test',published_at:new Date().toISOString(),social_image:'https://example.com/generated.png'},'devto');assert.equal(row?.og_image_url,null);});
