import jsPDF from 'jspdf';

// PDF-safe formatters (jsPDF Helvetica cannot render ฿ or Thai glyphs)
const formatCurr = (v) => {
  const num = Math.round(Number(v) || 0);
  return 'THB ' + num.toLocaleString('en-US');
};

const formatNum = (v) => {
  const num = Number(v) || 0;
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
};

// Color palette
const C = {
  darkBlue: [15, 23, 42],
  blue: [59, 130, 246],
  white: [255, 255, 255],
  light: [241, 245, 249],
  gray: [100, 116, 139],
  darkGray: [51, 65, 85],
  emerald: [16, 185, 129],
  amber: [245, 158, 11],
};

function drawRoundedRect(doc, x, y, w, h, r, fillColor) {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

function drawLine(doc, x1, y1, x2, y2, color = C.light, width = 0.3) {
  doc.setDrawColor(...color);
  doc.setLineWidth(width);
  doc.line(x1, y1, x2, y2);
}



export async function generatePdf({ inputs, results, chartData, savedScenarios, breakevenMessages, chartElement, logoDataUrl }) {
  const doc = new jsPDF('p', 'mm', 'a4');

  // Helper to remove non-ASCII chars (mostly Thai) to prevent garbled PDF
  const cleanStr = (s) => (s || '').replace(/[^\x00-\x7F]/g, '?');

  const pw = 210;
  const ph = 297;
  const mx = 15;
  const contentW = pw - mx * 2;
  const footerZone = 18; // reserved bottom space for footer
  let y = 0;

  // Helper: check if we need a new page
  const needsPage = (requiredH) => {
    if (y + requiredH > ph - footerZone) {
      doc.addPage();
      drawPageHeader(doc, pw, mx);
      y = 18;
      return true;
    }
    return false;
  };

  // ========================================
  // PAGE 1: HEADER BANNER
  // ========================================
  doc.setFillColor(...C.darkBlue);
  doc.rect(0, 0, pw, 48, 'F');
  doc.setFillColor(...C.blue);
  doc.rect(0, 48, pw, 1.5, 'F');

  doc.setTextColor(...C.white);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('PUMP TCO MASTER', mx, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 200, 230);
  doc.text('Total Cost of Ownership Analysis Report', mx, 28);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
  doc.setFontSize(8);
  doc.setTextColor(140, 160, 190);
  doc.text(`Generated: ${dateStr}`, mx, 37);

  // Company Logo (Direct Area)
  const logoSize = 30;
  const logoX = pw - mx - logoSize;
  const logoY = 9;

  // Add logo image if provided via Data URL (No circle, no clipping)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, logoDataUrl.includes('png') ? 'PNG' : 'JPEG', logoX, logoY, logoSize, logoSize);
    } catch (e) {
      console.warn('Failed to render logo data URL', e);
    }
  }





  y = 56;

  // ========================================
  // SECTION: PARAMETER SUMMARY
  // ========================================
  drawSectionHeader(doc, mx, y, contentW, 'PARAMETER SUMMARY');
  y += 12;

  const params = [
    ['Capital Expenditure (CapEx)', formatCurr(inputs.initialCost), 'THB'],
    ['Motor Power Rating', formatNum(inputs.powerRating), 'kW'],
    ['Operating Hours / Year', formatNum(inputs.operatingHours), 'Hr/Year'],
    ['Electricity Cost', formatNum(inputs.electricityCost), 'THB/Unit'],
    ['Maintenance Cost / Year', formatCurr(inputs.maintenanceCost), 'THB/Year'],
    ['Project Lifecycle', inputs.lifecycle, 'Years'],
  ];

  // Table header
  drawRoundedRect(doc, mx, y, contentW, 7, 1.5, C.light);
  doc.setTextColor(...C.darkGray);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PARAMETER', mx + 4, y + 4.8);
  doc.text('VALUE', mx + contentW * 0.55, y + 4.8);
  doc.text('UNIT', mx + contentW * 0.82, y + 4.8);
  y += 9;

  params.forEach((row, i) => {
    needsPage(7);
    const rowBg = i % 2 === 0 ? C.white : [245, 248, 252];
    drawRoundedRect(doc, mx, y, contentW, 7, 0, rowBg);
    doc.setTextColor(...C.darkGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(row[0], mx + 4, y + 4.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.darkBlue);
    doc.text(String(row[1]), mx + contentW * 0.55, y + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.gray);
    doc.setFontSize(7);
    doc.text(row[2], mx + contentW * 0.82, y + 4.8);
    y += 7;
  });

  y += 6;



  // ========================================
  // SECTION: TCO RESULTS
  // ========================================
  needsPage(75); // ensure enough room for TCO block
  drawSectionHeader(doc, mx, y, contentW, 'TOTAL COST OF OWNERSHIP RESULTS');
  y += 12;

  // Big TCO box
  drawRoundedRect(doc, mx, y, contentW, 26, 4, [240, 245, 255]);
  doc.setFillColor(...C.blue);
  doc.roundedRect(mx, y, 4, 26, 2, 2, 'F');

  doc.setTextColor(...C.gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL COST OF OWNERSHIP', mx + 10, y + 7);
  doc.setTextColor(...C.darkBlue);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurr(results.totalTCO), mx + 10, y + 18);
  doc.setTextColor(...C.gray);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Over ${inputs.lifecycle} year lifecycle`, mx + 10, y + 23);
  y += 30;

  // Sub-results row
  const subResults = [
    { label: 'Energy Cost (Cumulative)', value: formatCurr(results.totalEnergyCost), color: C.blue },
    { label: 'Maintenance (Cumulative)', value: formatCurr(results.totalMaintenanceCost), color: C.emerald },
    { label: 'Average Cost / Year', value: formatCurr(results.averageYearlyCost), color: C.amber },
  ];

  const subW = (contentW - 6) / 3;
  subResults.forEach((item, i) => {
    const sx = mx + i * (subW + 3);
    drawRoundedRect(doc, sx, y, subW, 18, 3, [245, 248, 252]);
    doc.setFillColor(...item.color);
    doc.roundedRect(sx, y, subW, 2.5, 1.5, 1.5, 'F');

    doc.setTextColor(...C.gray);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(item.label, sx + 4, y + 7);
    doc.setTextColor(...C.darkBlue);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, sx + 4, y + 14);
  });
  y += 24;

  // ========================================
  // SECTION: COST DISTRIBUTION
  // ========================================
  needsPage(55);
  y += 2;
  drawSectionHeader(doc, mx, y, contentW, 'COST DISTRIBUTION');
  y += 12;

  const distributions = [
    { label: 'Capital Expenditure (CapEx)', pct: results.percentages.initial, color: C.darkGray },
    { label: 'Energy Cost (OpEx)', pct: results.percentages.energy, color: C.blue },
    { label: 'Maintenance Cost', pct: results.percentages.maintenance, color: C.emerald },
  ];

  distributions.forEach(item => {
    doc.setTextColor(...C.darkGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, mx + 2, y + 3);
    doc.setFont('helvetica', 'bold');
    doc.text(`${item.pct.toFixed(1)}%`, mx + contentW - 2, y + 3, { align: 'right' });
    y += 5;
    drawRoundedRect(doc, mx, y, contentW, 4.5, 2, [230, 235, 240]);
    const barW = Math.max((item.pct / 100) * contentW, 0.5);
    drawRoundedRect(doc, mx, y, barW, 4.5, 2, item.color);
    y += 8;
  });

  // ========================================
  // SECTION: ENGINEERING VERDICT
  // ========================================
  needsPage(35);
  y += 2;
  drawSectionHeader(doc, mx, y, contentW, 'ENGINEERING VERDICT');
  y += 12;

  const verdictText = results.totalTCO <= 0
    ? 'No data provided for analysis.'
    : results.percentages.energy > 80
      ? 'Energy cost exceeds 80% of total TCO! Strongly recommend upgrading to a Premium Efficiency pump for fastest breakeven.'
      : 'Cost structure is well-balanced. Consider implementing a preventive maintenance plan to reduce Breakdown risk.';

  drawRoundedRect(doc, mx, y, contentW, 16, 3, [240, 248, 255]);
  doc.setFillColor(...C.blue);
  doc.roundedRect(mx, y, 3, 16, 1.5, 1.5, 'F');
  doc.setTextColor(...C.darkBlue);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const splitVerdict = doc.splitTextToSize(verdictText, contentW - 14);
  doc.text(splitVerdict, mx + 8, y + 7);
  y += 20;


  const translateBeMessage = (msg) => {
    if (!msg) return '';
    if (msg.includes('เทียบกับ')) {
      return msg.replace('เทียบกับ', 'Comp. to').replace('จุดคุ้มทุนในปีที่', 'Breakeven Year:');
    }
    if (msg.includes('จะคุ้มทุนเร็วกว่าในปีที่')) {
      return msg.replace('จะคุ้มทุนเร็วกว่าในปีที่', 'breaks even faster at Year:');
    }
    return cleanStr(msg);
  };

  // Breakeven messages
  if (breakevenMessages && breakevenMessages.length > 0) {
    const bh = 6 + breakevenMessages.length * 6;
    needsPage(bh + 4);
    drawRoundedRect(doc, mx, y, contentW, bh, 3, [240, 255, 245]);
    doc.setFillColor(...C.emerald);
    doc.roundedRect(mx, y, 3, bh, 1.5, 1.5, 'F');
    doc.setTextColor(5, 100, 70);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('BREAKEVEN ANALYSIS', mx + 8, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    breakevenMessages.forEach((msg, i) => {
      doc.text(`- ${translateBeMessage(msg)}`, mx + 8, y + 11 + i * 6);
    });
    y += bh + 4;
  }


  // ========================================
  // SECTION: LIFECYCLE CHART (drawn with jsPDF)
  // ========================================
  if (chartData && chartData.length > 1) {
    const chartTotalH = 105; // total height of entire chart block
    needsPage(chartTotalH + 16);
    y += 4;
    drawSectionHeader(doc, mx, y, contentW, 'LIFECYCLE COST & BREAKEVEN CHART');
    y += 12;

    // Chart area dimensions
    const padL = 22;  // left padding for Y labels
    const padR = 6;
    const padT = 6;
    const padB = 18;  // bottom for X labels + legend
    const boxH = chartTotalH;
    const boxW = contentW;
    const plotW = boxW - padL - padR;
    const plotH = boxH - padT - padB;
    const plotX = mx + padL; // left edge of plot area
    const plotY = y + padT;  // top edge of plot area

    // Background
    drawRoundedRect(doc, mx, y, boxW, boxH, 4, [15, 23, 42]);

    // Find max value & series
    const seriesKeys = Object.keys(chartData[0]).filter(k => k !== 'year');
    let maxVal = 0;
    chartData.forEach(d => {
      seriesKeys.forEach(k => {
        if ((d[k] || 0) > maxVal) maxVal = d[k];
      });
    });
    maxVal = maxVal * 1.08; // 8% headroom
    if (maxVal === 0) maxVal = 1;

    // Y-axis: nice round ticks
    const gridCount = 5;
    for (let g = 0; g <= gridCount; g++) {
      const ratio = g / gridCount;
      const gy = plotY + plotH - ratio * plotH;
      const gVal = maxVal * ratio;

      // Dashed grid line
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(0.08);
      const dashLen = 1.5;
      const gapLen = 1.5;
      for (let dx = plotX; dx < plotX + plotW; dx += dashLen + gapLen) {
        const endX = Math.min(dx + dashLen, plotX + plotW);
        doc.line(dx, gy, endX, gy);
      }

      // Y label
      doc.setTextColor(130, 145, 165);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'normal');
      let label;
      if (gVal >= 1000000) {
        label = `${(gVal / 1000000).toFixed(1)}M`;
      } else if (gVal >= 1000) {
        label = `${(gVal / 1000).toFixed(0)}k`;
      } else {
        label = `${gVal.toFixed(0)}`;
      }
      doc.text(label, plotX - 2, gy + 1, { align: 'right' });
    }

    // Y-axis title
    doc.setTextColor(100, 120, 145);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('THB', mx + 2, plotY + plotH / 2 - 2);

    // Series colors
    const lineColors = [
      [59, 130, 246],  // blue - Current Setup
      [16, 185, 129],  // emerald
      [245, 158, 11],  // amber
      [239, 68, 68],   // red
      [139, 92, 246],  // purple
      [236, 72, 153],  // pink
    ];

    const stepX = plotW / Math.max(chartData.length - 1, 1);

    // Draw lines + dots for each series
    seriesKeys.forEach((key, si) => {
      const color = lineColors[si % lineColors.length];

      // Draw line segments
      doc.setDrawColor(...color);
      doc.setLineWidth(si === 0 ? 0.9 : 0.6);

      const points = chartData.map((d, i) => ({
        x: plotX + i * stepX,
        y: plotY + plotH - ((d[key] || 0) / maxVal) * plotH,
      }));

      for (let i = 1; i < points.length; i++) {
        // Saved scenarios get dashed lines
        if (si > 0) {
          const dx = points[i].x - points[i - 1].x;
          const dy = points[i].y - points[i - 1].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const dashes = Math.max(Math.floor(dist / 2), 1);
          for (let d = 0; d < dashes; d += 2) {
            const t1 = d / dashes;
            const t2 = Math.min((d + 1) / dashes, 1);
            doc.line(
              points[i - 1].x + dx * t1, points[i - 1].y + dy * t1,
              points[i - 1].x + dx * t2, points[i - 1].y + dy * t2
            );
          }
        } else {
          doc.line(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
        }
      }

      // Draw dots at data points
      doc.setFillColor(...color);
      const dotR = si === 0 ? 0.9 : 0.7;
      // Only show dots at reasonable intervals
      const dotStep = chartData.length > 15 ? Math.ceil(chartData.length / 12) : 1;
      points.forEach((p, i) => {
        if (i % dotStep === 0 || i === points.length - 1) {
          doc.circle(p.x, p.y, dotR, 'F');
        }
      });
    });

    // X-axis labels
    doc.setTextColor(130, 145, 165);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    const xLabelStep = chartData.length > 15 ? Math.ceil(chartData.length / 10) : 1;
    chartData.forEach((d, i) => {
      if (i % xLabelStep === 0 || i === chartData.length - 1) {
        const tx = plotX + i * stepX;
        doc.text(`${d.year}`, tx, plotY + plotH + 4, { align: 'center' });
      }
    });

    // X-axis title
    doc.setTextColor(100, 120, 145);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'bold');
    doc.text('Year', plotX + plotW / 2, plotY + plotH + 8, { align: 'center' });

    // Legend
    const legendY = plotY + plotH + 11;
    let lx = plotX;
    seriesKeys.forEach((key, si) => {
      const color = lineColors[si % lineColors.length];
      doc.setFillColor(...color);
      doc.roundedRect(lx, legendY, 4, 2.5, 1, 1, 'F');
      doc.setTextColor(200, 210, 225);
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      const safeKey = cleanStr(key);
      const label = safeKey.length > 20 ? safeKey.substring(0, 18) + '..' : safeKey;
      doc.text(label, lx + 5.5, legendY + 2);
      lx += doc.getTextWidth(label) + 12;
    });

    y += boxH + 6;
  }

  // ========================================
  // SECTION: CUMULATIVE COST DATA TABLE
  // ========================================
  if (chartData && chartData.length > 0) {
    needsPage(30);
    y += 2;
    drawSectionHeader(doc, mx, y, contentW, 'CUMULATIVE COST DATA');
    y += 12;

    const scenarioNames = savedScenarios.map(s => cleanStr(s.name));
    const allCols = ['Year', 'Current Setup', ...scenarioNames];
    const colW = contentW / allCols.length;

    drawRoundedRect(doc, mx, y, contentW, 7, 1.5, C.light);
    doc.setTextColor(...C.darkGray);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    allCols.forEach((col, ci) => {
      doc.text(col, mx + ci * colW + 3, y + 4.8);
    });
    y += 8;

    const maxRows = 26;
    const step = chartData.length > maxRows ? Math.floor(chartData.length / maxRows) : 1;

    for (let ri = 0; ri < chartData.length; ri += step) {
      needsPage(7);
      const row = chartData[ri];
      const rowBg = (ri / step) % 2 === 0 ? C.white : [245, 248, 252];
      drawRoundedRect(doc, mx, y, contentW, 6, 0, rowBg);

      doc.setFontSize(7);
      allCols.forEach((col, ci) => {
        const tx = mx + ci * colW + 3;
        if (col === 'Year') {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...C.darkBlue);
          doc.text(`Year ${row.year}`, tx, y + 4);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...C.darkGray);
          const val = row[col];
          doc.text(val !== undefined ? formatCurr(val) : '-', tx, y + 4);
        }
      });
      y += 6;
    }
    y += 4;
  }

  // ========================================
  // SECTION: SAVED SIMULATIONS COMPARISON
  // ========================================
  if (savedScenarios.length > 0) {
    needsPage(30);
    y += 2;
    drawSectionHeader(doc, mx, y, contentW, 'SAVED SIMULATIONS COMPARISON');
    y += 12;

    const simCols = [
      { label: 'NAME', w: 0.18 },
      { label: 'CAPEX', w: 0.14 },
      { label: 'kW', w: 0.08 },
      { label: 'HR/YR', w: 0.1 },
      { label: 'THB/UNIT', w: 0.1 },
      { label: 'MAINT/YR', w: 0.14 },
      { label: 'LIFE', w: 0.08 },
      { label: 'TOTAL TCO', w: 0.18 },
    ];

    drawRoundedRect(doc, mx, y, contentW, 7, 1.5, C.light);
    doc.setTextColor(...C.darkGray);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    let cx = mx + 2;
    simCols.forEach(col => {
      doc.text(col.label, cx, y + 4.8);
      cx += contentW * col.w;
    });
    y += 8;

    savedScenarios.forEach((s, si) => {
      needsPage(8);
      const rowBg = si % 2 === 0 ? C.white : [245, 248, 252];
      drawRoundedRect(doc, mx, y, contentW, 7, 0, rowBg);
      doc.setFontSize(7);
      cx = mx + 2;

      const vals = [
        cleanStr(s.name),
        formatCurr(s.inputs.initialCost),
        String(s.inputs.powerRating),
        String(s.inputs.operatingHours),
        String(s.inputs.electricityCost),
        formatCurr(s.inputs.maintenanceCost),
        `${s.inputs.lifecycle} Yr`,
        formatCurr(s.results.totalTCO),
      ];

      vals.forEach((v, vi) => {
        if (vi === vals.length - 1) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...C.blue);
        } else if (vi === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...C.darkBlue);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(...C.darkGray);
        }
        doc.text(String(v), cx, y + 4.8);
        cx += contentW * simCols[vi].w;
      });
      y += 7;
    });
  }

  // ========================================
  // SECTION: TCO METHODOLOGY & FORMULA
  // ========================================
  needsPage(40);
  y += 2;
  drawSectionHeader(doc, mx, y, contentW, 'TCO CALCULATION METHODOLOGY');
  y += 10;

  drawRoundedRect(doc, mx, y, contentW, 26, 3, [248, 250, 252]);
  doc.setFillColor(...C.emerald);
  doc.roundedRect(mx, y, 3, 26, 1.5, 1.5, 'F');
  
  doc.setTextColor(...C.darkBlue);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Cost of Ownership (TCO)  =  CapEx + Lifecycle Energy Cost + Lifecycle Maintenance Cost', mx + 7, y + 6);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.gray);
  doc.text('• CapEx (Capital Expenditure): Initial pump purchase and installation cost', mx + 7, y + 12);
  doc.text('• Energy Cost = Motor Power (kW) x Operating Hours/Year x Electricity Rate (THB/Unit) x Lifecycle', mx + 7, y + 17);
  doc.text('• Maintenance Cost = Annual Maintenance Cost (THB/Year) x Lifecycle', mx + 7, y + 22);

  y += 34;

  // ========================================
  // FOOTER on all pages
  // ========================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawLine(doc, mx, ph - 12, pw - mx, ph - 12, [220, 225, 230]);
    doc.setTextColor(...C.gray);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('PUMP TCO MASTER  -  Industrial Intelligence Unit', mx, ph - 7);
    doc.text(`Page ${p} of ${totalPages}`, pw - mx, ph - 7, { align: 'right' });
  }

  doc.save(`Pump_TCO_Report_${now.toISOString().slice(0, 10)}.pdf`);
}

// ---------- helpers ----------

function drawSectionHeader(doc, x, y, w, title) {
  drawRoundedRect(doc, x, y, w, 8, 2, [15, 23, 42]);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(title, x + 4, y + 5.5);
}

function drawPageHeader(doc, pw, mx) {
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pw, 10, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 10, pw, 0.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('PUMP TCO MASTER  -  Analysis Report', mx, 6.5);
}
