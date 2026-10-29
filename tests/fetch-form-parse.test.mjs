import { describe, it, expect } from 'vitest';
import { parseContactFormsFromHtml } from '../src/lib/services/form-detector.ts';

const page = 'https://example.test/contact';

describe('parseContactFormsFromHtml (honest fetch detection)', () => {
  it('parses a real static form with real fields, action, and method', () => {
    const html = `<html><body><form id="contact-form" action="/contact" method="post">
      <input type="text" name="name" required>
      <input type="email" name="email" required>
      <textarea name="message" required></textarea>
      <button type="submit">Send</button></form></body></html>`;
    const form = parseContactFormsFromHtml(html, page);
    expect(form).not.toBeNull();
    expect(form.formSelector).toBe('#contact-form');
    expect(form.action).toBe('https://example.test/contact');
    expect(form.method).toBe('post');
    const types = Object.fromEntries(form.fields.map((f) => [f.name, f.normalizedType]));
    expect(types).toMatchObject({ name: 'full_name', email: 'email', message: 'message' });
    expect(form.fields.find((f) => f.name === 'email').isRequired).toBe(true);
    expect(form.fields.find((f) => f.name === 'email').selector).toBe('[name="email"]');
  });

  it('returns null when the HTML has no form (client-rendered page)', () => {
    const html = `<html><body><div id="root"></div><script src="/app.js"></script><p>Send us a message</p></body></html>`;
    expect(parseContactFormsFromHtml(html, page)).toBeNull();
  });

  it('returns null for a form with no mappable fields (cannot be filled safely)', () => {
    const html = `<html><body><form action="/x"><input type="text" name="field_1"><input type="text" name="field_2"></form></body></html>`;
    expect(parseContactFormsFromHtml(html, page)).toBeNull();
  });

  it('skips login and newsletter forms and picks the contact form', () => {
    const html = `<html><body>
      <form id="login" action="/login"><input type="email" name="email"><input type="password" name="password"></form>
      <form id="signup" action="/subscribe"><input type="email" name="email"></form>
      <form action="/contact"><input type="text" name="name"><input type="email" name="email"><textarea name="message"></textarea></form>
    </body></html>`;
    const form = parseContactFormsFromHtml(html, page);
    expect(form).not.toBeNull();
    expect(form.action).toBe('https://example.test/contact');
  });

  it('parses select options and required checkboxes', () => {
    const html = `<html><body><form action="/quote"><input type="text" name="name">
      <select name="inquiry_type"><option>General</option><option>Sales</option></select>
      <input type="checkbox" name="privacy-consent" required>
      <textarea name="message"></textarea></form></body></html>`;
    const form = parseContactFormsFromHtml(html, page);
    expect(form).not.toBeNull();
    const select = form.fields.find((f) => f.name === 'inquiry_type');
    expect(select.normalizedType).toBe('select');
    expect(select.options).toEqual(['General', 'Sales']);
    expect(form.fields.find((f) => f.name === 'privacy-consent').normalizedType).toBe('checkbox');
    expect(form.fields.find((f) => f.name === 'privacy-consent').isRequired).toBe(true);
  });

  it('returns null when only a login form exists', () => {
    const html = `<html><body><form action="/login"><input type="email" name="email"><input type="password" name="password"></form></body></html>`;
    expect(parseContactFormsFromHtml(html, page)).toBeNull();
  });
});
