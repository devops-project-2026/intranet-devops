import fs from 'fs';

async function testUpload() {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
        throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD are required');
    }

    // 1. Get token
    const loginRes = await fetch('http://localhost:8000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
    });
    const { token } = await loginRes.json();
    console.log('Got token:', token ? 'Yes' : 'No');

    // 2. Create post
    const postRes = await fetch('http://localhost:8000/api/posts', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test post with upload' })
    });
    const post = await postRes.json();
    console.log('Created post:', post.id);

    // 3. Upload attachment
    const formData = new FormData();
    const blob = new Blob(['test file content'], { type: 'text/plain' });
    formData.append('file', blob, 'test.txt');
    formData.append('accessType', 'public');

    const uploadRes = await fetch(`http://localhost:8000/api/posts/${post.id}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });
    const text = await uploadRes.text();
    console.log('Upload response:', uploadRes.status, text);
}

testUpload();
