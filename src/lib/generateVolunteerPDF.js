import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Generate a Volunteer Hours Verification PDF for a member.
 * Matches the official SPAN verification letter template.
 *
 * @param {Object} member - Member data (first_name, last_name, dob, city, state, email, role)
 * @param {Array} approvedEntries - Array of approved volunteer entries
 * @param {Object} supabaseClient - Authenticated Supabase client (for fetching signature image)
 * @returns {Promise<{ pdfBlob: Blob, pdfBase64: string }>}
 */
export async function generateVolunteerPDF(member, approvedEntries, supabaseClient) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginLeft = 60
  const marginRight = 60
  const contentWidth = pageWidth - marginLeft - marginRight

  // SPAN brand colors
  const spanNavy = [22, 33, 62]  // #16213E
  const spanBlue = [0, 102, 204]  // #0066CC

  // -- Helpers --
  const formatDob = (dateStr) => {
    if (!dateStr) return 'N/A'
    const [year, month, day] = dateStr.split('-').map(Number)
    const d = new Date(year, month - 1, day)
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const formatServiceDate = (timestamp) => {
    const d = new Date(timestamp)
    return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`
  }

  const calcDuration = (start, end) => {
    const ms = new Date(end) - new Date(start)
    const totalMins = Math.round(ms / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (h === 0) return `${m} mins`
    if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`
    return `${h} hour${h !== 1 ? 's' : ''} ${m} min${m !== 1 ? 's' : ''}`
  }

  const calcTotalHours = (entries) => {
    let totalMs = 0
    entries.forEach(e => {
      totalMs += new Date(e.end_timestamp) - new Date(e.start_timestamp)
    })
    const totalMins = Math.round(totalMs / 60000)
    const h = Math.floor(totalMins / 60)
    const m = totalMins % 60
    if (m === 0) return `${h} hour${h !== 1 ? 's' : ''}`
    return `${h} hour${h !== 1 ? 's' : ''} ${m} min${m !== 1 ? 's' : ''}`
  }

  let y = 50

  // ===== HEADER WITH LOGO AND ORG INFO INLINE =====
  const headerStartY = y
  
  // Add SPAN logo on the left (using PNG)
  try {
    // Load the logo PNG from the uploaded file or URL
    const logoUrl = 'https://spanationwide.org/images/index/logo-wide-dark.png'
    const response = await fetch(logoUrl)
    const blob = await response.blob()
    
    // Convert to base64 data URL
    const arrayBuffer = await blob.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i])
    }
    const base64 = btoa(binary)
    const imgData = `data:image/png;base64,${base64}`
    
    // Add logo - sized to fit neatly
    const logoWidth = 121
    const logoHeight = 27
    const logoX = marginLeft
    doc.addImage(imgData, 'PNG', logoX, y, logoWidth, logoHeight)
    
    // Organization name below logo
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...spanNavy)
    doc.text('Students for Patient Advocacy Nationwide', logoX, y + logoHeight + 12)
    
  } catch (err) {
    // Fallback to text if logo fails
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...spanNavy)
    doc.text('SPAN', marginLeft, y)
    y += 18
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Students for Patient Advocacy Nationwide', marginLeft, y)
  }

  // Address and website on the right, aligned with top of logo
  let rightY = headerStartY + 8  // Adjusted to align better with logo top
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(150, 150, 150)  // Gray text
  doc.text('1702 Clifton Road Suite 1650', pageWidth - marginRight, rightY, { align: 'right' })
  rightY += 14
  doc.text('Atlanta, GA 30322', pageWidth - marginRight, rightY, { align: 'right' })
  rightY += 14
  doc.setTextColor(...spanBlue)
  doc.text('www.spanationwide.org', pageWidth - marginRight, rightY, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  // Move y position past the header content
  y = headerStartY + 60

  // Horizontal separator line
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(1)
  doc.line(marginLeft, y, pageWidth - marginRight, y)
  y += 30

  // ===== TITLE =====
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...spanNavy)
  doc.text('Community Service', pageWidth / 2, y, { align: 'center' })
  y += 25
  doc.setFontSize(14)
  doc.text('Verification of Volunteer Hours', pageWidth / 2, y, { align: 'center' })
  y += 30
  doc.setTextColor(0, 0, 0)

  // ===== INTRO PARAGRAPH =====
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const introText = 'This document certifies that the individual listed below has completed volunteer service with Students for Patient Advocacy Nationwide (SPAN).'
  const introLines = doc.splitTextToSize(introText, contentWidth)
  doc.text(introLines, marginLeft, y)
  y += introLines.length * 14 + 20

  // ===== VOLUNTEER INFORMATION =====
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Volunteer Information', marginLeft, y)
  y += 20

  doc.setFontSize(10)
  const fullName = `${member.first_name || ''} ${member.last_name || ''}`.trim()
  const location = [member.city, member.state].filter(Boolean).join(', ') || 'N/A'

  const infoFields = [
    ['Name', fullName || 'N/A'],
    ['Date of Birth', formatDob(member.dob)],
    ['Location', location],
    ['Email', member.email || 'N/A'],
    ['Role', member.role || 'N/A'],
  ]

  infoFields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, marginLeft, y)
    doc.setFont('helvetica', 'normal')
    doc.text(value, marginLeft + 90, y)
    y += 16
  })

  y += 15

  // ===== SERVICE DETAILS TABLE =====
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Service Details', marginLeft, y)
  y += 8

  // Sort entries by date
  const sortedEntries = [...approvedEntries].sort(
    (a, b) => new Date(a.start_timestamp) - new Date(b.start_timestamp)
  )

  const tableBody = sortedEntries.map(entry => [
    formatServiceDate(entry.start_timestamp),
    `${entry.volunteering_job_title || ''}\n${entry.volunteering_job_desc || ''}`.trim(),
    calcDuration(entry.start_timestamp, entry.end_timestamp)
  ])

  // Total row
  tableBody.push([
    { content: '', styles: { fillColor: [245, 245, 245] } },
    { content: 'Total', styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'right' } },
    { content: calcTotalHours(sortedEntries), styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } }
  ])

  autoTable(doc, {
    startY: y,
    margin: { left: marginLeft, right: marginRight },
    head: [['Date', 'Activity', 'Duration']],
    body: tableBody,
    styles: {
      fontSize: 9,
      cellPadding: 8,
      lineColor: [200, 200, 200],
      lineWidth: 0.5,
      textColor: [40, 40, 40],
    },
    headStyles: {
      fillColor: spanNavy,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 65 },
      1: { cellWidth: contentWidth - 65 - 85 },
      2: { cellWidth: 85, halign: 'center' },
    },
    didDrawPage: (data) => {
      // Footer with page number
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(150, 150, 150)
      doc.text(
        `${data.pageNumber}`,
        pageWidth / 2,
        pageHeight - 30,
        { align: 'center' }
      )
      doc.setTextColor(0, 0, 0)
    },
  })

  y = doc.lastAutoTable.finalY + 35

  // ===== STATEMENT OF VERIFICATION =====
  // Always start on a new (last) page for cleanliness
  doc.addPage()
  y = 50

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Statement of Verification', marginLeft, y)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const verifyText1 = 'We hereby confirm that the above-named individual completed the volunteer service described above with SPAN. The hours listed have been reviewed and verified in accordance with our internal volunteer tracking system.'
  const verifyLines1 = doc.splitTextToSize(verifyText1, contentWidth)
  doc.text(verifyLines1, marginLeft, y)
  y += verifyLines1.length * 14 + 12

  const verifyText2 = 'These hours were completed on a voluntary, unpaid basis and demonstrate valuable, meaningful civic engagement in healthcare and patient advocacy.'
  const verifyLines2 = doc.splitTextToSize(verifyText2, contentWidth)
  doc.text(verifyLines2, marginLeft, y)
  y += verifyLines2.length * 14 + 35

  // ===== SIGNATURES IMAGE =====
  let signaturesAdded = false
  if (supabaseClient) {
    try {
      const { data: signData, error: signError } = await supabaseClient.storage
        .from('signatures')
        .download('signs.png')

      if (!signError && signData) {
        // Convert blob to base64 data URL
        const arrayBuffer = await signData.arrayBuffer()
        const uint8 = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i])
        }
        const base64 = btoa(binary)
        const imgData = `data:image/png;base64,${base64}`

        // Sized to avoid stretching
        const imgWidth = contentWidth * 0.82
        const imgHeight = imgWidth * 0.55
        const imgX = marginLeft

        // Check if enough space, otherwise add page
        if (y + imgHeight > pageHeight - 50) {
          doc.addPage()
          y = 50
        }

        doc.addImage(imgData, 'PNG', imgX, y, imgWidth, imgHeight)
        y += imgHeight + 10
        signaturesAdded = true
      }
    } catch (err) {
      console.error('Failed to load signatures image:', err)
    }
  }

  // Fallback: text-only signatures if image failed to load
  if (!signaturesAdded) {
    const signatures = [
      'Vishank Panchbhavi, Executive Director',
      'Shayan Saqib, Executive Director',
      'Ben Kurian, Executive Director',
      'Joel Blessan, Executive Director',
    ]

    const signaturesPerRow = 2
    const sigWidth = (contentWidth - 50) / 2
    
    for (let i = 0; i < signatures.length; i += signaturesPerRow) {
      if (y > pageHeight - 80) {
        doc.addPage()
        y = 50
      }

      // First signature in row
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.5)
      doc.line(marginLeft, y + 20, marginLeft + sigWidth - 20, y + 20)
      
      // Second signature in row (if exists)
      if (i + 1 < signatures.length) {
        doc.line(marginLeft + sigWidth + 20, y + 20, pageWidth - marginRight, y + 20)
      }
      
      y += 26
      
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(signatures[i], marginLeft, y)
      
      if (i + 1 < signatures.length) {
        doc.text(signatures[i + 1], marginLeft + sigWidth + 20, y)
      }
      
      y += 30
    }
  }

  // Update page numbers on all pages
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(
      `${i}`,
      pageWidth / 2,
      pageHeight - 30,
      { align: 'center' }
    )
    doc.setTextColor(0, 0, 0)
  }

  // Generate outputs
  const pdfBlob = doc.output('blob')
  const pdfBase64 = doc.output('datauristring').split(',')[1]

  return { pdfBlob, pdfBase64 }
}