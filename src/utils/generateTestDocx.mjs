/**
 * Script to generate a test .docx file with intentional formatting issues
 * for testing Smart-Draft's scanner and fixer.
 * 
 * Run: node src/utils/generateTestDocx.mjs
 */

import JSZip from 'jszip'
import { writeFileSync } from 'fs'

const zip = new JSZip()

// [Content_Types].xml
zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`)

// _rels/.rels
zip.folder('_rels').file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`)

// word/_rels/document.xml.rels
zip.folder('word').folder('_rels').file('document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)

// word/document.xml — with INTENTIONAL formatting issues:
// - Left margin 1701 (3cm) instead of 2268 (4cm)
// - Font: Arial instead of Times New Roman
// - Font size: 22 half-points (11pt) instead of 24 (12pt)
// - Line spacing: 276 (1.15) instead of 360 (1.5)
zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading1"/>
        <w:spacing w:line="276" w:lineRule="auto" w:before="0" w:after="200"/>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
          <w:sz w:val="28"/>
          <w:szCs w:val="28"/>
          <w:b/>
        </w:rPr>
        <w:t>BAB I PENDAHULUAN</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:before="0" w:after="200"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">Latar belakang penelitian ini adalah tentang pengembangan sistem formatting otomatis untuk dokumen skripsi di Telkom University. Sistem ini bertujuan untuk membantu mahasiswa dalam memformat dokumen skripsi mereka sesuai dengan standar akademik yang berlaku.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:before="0" w:after="200"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">Formatting dokumen skripsi merupakan salah satu aspek penting dalam penulisan akademik. Banyak mahasiswa yang menghadapi kesulitan dalam memenuhi persyaratan formatting yang ditetapkan oleh universitas.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Heading2"/>
        <w:spacing w:line="276" w:lineRule="auto" w:before="200" w:after="100"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
          <w:b/>
        </w:rPr>
        <w:t>1.1 Latar Belakang</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:before="0" w:after="200"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">Dalam dunia akademik, format penulisan skripsi memiliki standar yang harus dipatuhi. Standar ini mencakup berbagai aspek seperti ukuran margin, jenis dan ukuran font, spasi antar baris, serta format penomoran halaman.</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:pPr>
        <w:spacing w:line="276" w:lineRule="auto" w:before="0" w:after="200"/>
        <w:jc w:val="left"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
          <w:sz w:val="22"/>
          <w:szCs w:val="22"/>
        </w:rPr>
        <w:t xml:space="preserve">Telkom University menerapkan standar formatting yang ketat untuk semua dokumen skripsi. Margin yang digunakan adalah 4cm untuk margin kiri, dan 3cm untuk margin atas, bawah, dan kanan. Font yang digunakan adalah Times New Roman dengan ukuran 12pt dan spasi 1.5.</w:t>
      </w:r>
    </w:p>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1701" w:right="1701" w:bottom="1701" w:left="1701" w:header="720" w:footer="720"/>
    </w:sectPr>
  </w:body>
</w:document>`)

// word/styles.xml — with wrong defaults
zip.file('word/styles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/>
        <w:sz w:val="22"/>
        <w:szCs w:val="22"/>
      </w:rPr>
    </w:rPrDefault>
    <w:pPrDefault>
      <w:pPr>
        <w:spacing w:after="160" w:line="259" w:lineRule="auto"/>
      </w:pPr>
    </w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:pPr>
      <w:spacing w:after="160" w:line="259" w:lineRule="auto"/>
    </w:pPr>
    <w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
      <w:sz w:val="22"/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:sz w:val="28"/>
      <w:b/>
    </w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr>
      <w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>
      <w:sz w:val="24"/>
      <w:b/>
    </w:rPr>
  </w:style>
</w:styles>`)

async function generate() {
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  writeFileSync('public/test_thesis.docx', buffer)
  console.log('✅ Test .docx created at public/test_thesis.docx')
  console.log('')
  console.log('Issues this file has:')
  console.log('  ❌ Left margin: 3cm (should be 4cm)')
  console.log('  ❌ Font: Arial/Calibri (should be Times New Roman)')
  console.log('  ❌ Font size: 11pt (should be 12pt)')
  console.log('  ❌ Line spacing: 1.08/1.15 (should be 1.5)')
  console.log('  ❌ After-paragraph spacing: 160/200 twips (should be 0)')
}

generate()
