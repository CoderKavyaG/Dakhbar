import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeFeed,ingestFeeds} from '../src/lib/ingestion/rss';
import type {DocumentInput,IngestionStore} from '../src/lib/ingestion/hn';
const date=new Date().toISOString();
const rss=`<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><item><guid>r1</guid><title>React &amp; Rust</title><link>https://example.com/story</link><pubDate>${date}</pubDate><description><![CDATA[<p>Real excerpt</p>]]></description><media:thumbnail url="https://example.com/photo.jpg"/></item></channel></rss>`;
test('RSS preserves publication time, CDATA excerpt and image without fetching article pages',()=>{const r=normalizeFeed(rss,'rss','https://example.com/feed')[0]!;assert.equal(r.title,'React & Rust');assert.equal(r.published_at.toISOString(),date);assert.equal(r.og_description,'Real excerpt');assert.equal(r.og_image_url,'https://example.com/photo.jpg');});
test('Atom selects alternate links and published over updated, supports namespaces',()=>{
 const xml=`<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>a1</id><title>Rust release</title><link rel="self" href="/api/1"/><link rel="alternate" href="/post"/><published>2026-01-01T12:00:00Z</published><updated>${date}</updated><summary>Rust shipped.</summary></entry></feed>`;
 const r=normalizeFeed(xml,'rss','https://example.com/feed')[0]!;assert.equal(r.url,'https://example.com/post');assert.equal(r.published_at.toISOString(),'2026-01-01T12:00:00.000Z');
 assert.equal(normalizeFeed('<rss><channel><item><title>Missing date</title><link>https://example.com/a</link></item></channel></rss>','s','https://example.com')[0],null);
});
test('malformed XML, DTD and unclosed tags are rejected',()=>{for(const xml of ['<rss><channel></rss>','<!DOCTYPE x [<!ENTITY x SYSTEM "file:///secret">]><rss/>','<rss><channel>'])assert.throws(()=>normalizeFeed(xml,'s','https://example.com'));});
test('broken and unavailable feeds do not stop later feed insertion',async()=>{
 const rows:DocumentInput[]=[];const store:IngestionStore={ensureSource:async()=>'s',existingIds:async()=>[],insert:async row=>{rows.push(row);return true;}};
 const feeds=['bad','offline','good'].map(name=>({name,entity:'React',url:'https://example.com/'+name}));
 const result=await ingestFeeds(()=>store,['React'],async url=>String(url).endsWith('offline')?new Response('',{status:503}):new Response(String(url).endsWith('bad')?'<rss>':rss),feeds);
 assert.equal(result.failed,2);assert.equal(result.inserted,1);assert.equal(rows.length,1);
});
test('HTML doctype text inside feed CDATA is inert and does not reject a legitimate publisher feed',()=>{const xml=rss.replace('Real excerpt','<!DOCTYPE html> Real excerpt');assert.ok(normalizeFeed(xml,'s','https://example.com')[0]);});
