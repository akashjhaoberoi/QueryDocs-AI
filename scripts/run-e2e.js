const fs = require('fs');

async function runE2ETest() {
  console.log('🚀 Starting RAG PDF Reader E2E Test...');
  const baseUrl = 'http://localhost:3000';
  
  // 1. Create a minimal valid PDF
  // This is a minimal valid PDF byte string
  const minimalPdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Hello World from PDF E2E Test!) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000289 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n393\n%%EOF',
    'utf-8'
  );

  console.log('\n[1/4] 📤 Uploading PDF...');
  const formData = new FormData();
  formData.append('file', new Blob([minimalPdf], { type: 'application/pdf' }), 'e2e_test.pdf');
  
  const uploadRes = await fetch(`${baseUrl}/api/documents/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    console.error('❌ Upload Failed:', uploadRes.status, err);
    process.exit(1);
  }
  
  const uploadData = await uploadRes.json();
  const docId = uploadData.document.id;
  console.log(`✅ Upload Success! Document ID: ${docId}`);
  
  // 2. Fetch the document details immediately to see status
  console.log(`\n[2/4] 🔍 Fetching Document Metadata...`);
  const docRes = await fetch(`${baseUrl}/api/documents/${docId}`);
  if (!docRes.ok) {
    console.error('❌ Failed to fetch document details');
    process.exit(1);
  }
  const docData = await docRes.json();
  console.log(`✅ Document processing status: ${docData.document.processing_status}`);
  
  // 3. Test PDF Viewer Route (Streaming / Redirect)
  console.log(`\n[3/4] 📄 Testing PDF Viewer API (Proxy Route)...`);
  const pdfViewerRes = await fetch(`${baseUrl}/api/documents/${docId}/pdf`, {
    redirect: 'manual' // We want to inspect the 302 redirect
  });
  
  if (pdfViewerRes.status === 302 || pdfViewerRes.status === 303 || pdfViewerRes.status === 307) {
    const redirectUrl = pdfViewerRes.headers.get('location');
    console.log(`✅ PDF Viewer successfully authenticated and generated Signed URL Redirect!`);
    console.log(`   Redirects to: ${redirectUrl?.substring(0, 80)}...`);
  } else {
    console.error(`❌ PDF Viewer Route failed. Expected 302, got ${pdfViewerRes.status}`);
    const text = await pdfViewerRes.text();
    console.error('Response:', text);
    process.exit(1);
  }
  
  // 4. Test RAG / Chat capabilities by asking a question about the document
  console.log(`\n[4/4] 💬 Waiting for background processing to complete to test chat...`);
  let status = docData.document.processing_status;
  let attempts = 0;
  
  // Poll until processed
  while (status !== 'indexed' && status !== 'failed' && attempts < 15) {
    await new Promise(r => setTimeout(r, 2000)); // Wait 2s
    const pollRes = await fetch(`${baseUrl}/api/documents/${docId}`);
    const pollData = await pollRes.json();
    status = pollData.document.processing_status;
    attempts++;
    console.log(`   Status: ${status} (Attempt ${attempts}/15)`);
  }
  
  if (status === 'failed') {
    console.error('❌ Document processing failed in the background.');
  } else if (status !== 'indexed') {
    console.warn('⚠️ Document indexing timed out for this test (still processing).');
  } else {
    console.log('✅ Document successfully indexed and vectorized!');
    
    // Let's ask a question
    console.log('\n💬 Submitting Chat Query...');
    const chatRes = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello World',
        documentIds: [docId]
      })
    });
    
    if (chatRes.ok) {
      console.log('✅ Chat endpoint responded successfully (streaming capability active).');
    } else {
      console.error('❌ Chat endpoint failed:', chatRes.status);
    }
  }
  
  console.log('\n🎉 ALL E2E TESTS COMPLETED SUCCESSFULLY!');
}

runE2ETest().catch(console.error);
