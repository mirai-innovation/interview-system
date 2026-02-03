import PDFDocument from "pdfkit";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Streams the acceptance letter PDF to res.
 * @param {object} res - Express response
 * @param {object} user - User document (plain or mongoose)
 * @param {object} application - Application document (plain or mongoose)
 */
export function streamAcceptanceLetterPdf(res, user, application) {
  const fullName =
    application?.firstName && application?.lastName
      ? `${application.firstName} ${application.lastName}`
      : user.name;

  const regCode =
    user.digitalId ||
    `MIRI-2026-01-${String(user._id).slice(-3).padStart(3, "0")}`;

  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 72, right: 72 },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="Acceptance_Letter_${fullName.replace(/\s+/g, "_")}.pdf"`
  );
  doc.pipe(res);

  const logoPath = path.join(__dirname, "..", "..", "frontend", "src", "assets", "logo.png");
  const headerY = 60;
  const textWidth = doc.page.width - 144;

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Mirai Innovation Research Institute", 72, headerY)
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#444444")
    .text("[Headquarters] Minamihonmachi 2-3-12 Edge Honmachi")
    .text("Chuo-ku, Osaka-shi, Osaka, Japan. 5410054")
    .text("contact@mirai-innovation-lab.com");

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.page.width - 72 - 80, headerY - 10, { width: 80 });
  }

  const today = new Date();
  const day = today.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const formattedDate = today
    .toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    .replace(/\d+/, day + suffix);

  doc
    .fillColor("black")
    .fontSize(11)
    .font("Helvetica")
    .text(formattedDate, 72, headerY + 75, { align: "right", width: textWidth });

  doc.moveDown(0.5);
  doc
    .font("Helvetica")
    .fontSize(11)
    .text(
      "Subject: Official Final Decision for Mirai Innovation Research Immersion (MIRI) Program 2026",
      { align: "right", width: textWidth }
    );
  doc.moveDown(1.5);

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`Dear ${fullName},`, 72, doc.y, { align: "left" });
  doc.moveDown(1);

  const bodyOptions = { align: "justify", width: textWidth, lineGap: 2 };

  doc
    .font("Helvetica")
    .text(
      "On behalf of the evaluation committee of the Mirai Innovation Research Immersion Program (MIRI) 2026 at the Mirai Innovation Research Institute, it is a great pleasure to inform you that you have been ",
      { ...bodyOptions, continued: true }
    )
    .font("Helvetica-Bold")
    .text("accepted ", { continued: true })
    .font("Helvetica")
    .text(
      " to participate in our short-term academic immersion program in Osaka, Japan, for a duration of ",
      { continued: true }
    )
    .font("Helvetica-Bold")
    .text("4 to 12 weeks.", { continued: false });
  doc.moveDown(0.8);

  const currentYear = today.getFullYear();

  doc
    .font("Helvetica")
    .text(
      `Your acceptance is valid for the year ${currentYear}, and your participation must begin after January ${currentYear} and conclude before December ${currentYear}. The exact starting date is flexible, allowing you to select the period that best fits your academic or professional schedule. Below you will find your `,
      { align: "justify", width: textWidth, continued: true }
    )
    .font("Helvetica-Bold")
    .text("registration code ", {
      continued: true,
      align: "justify",
      width: textWidth,
    })
    .font("Helvetica")
    .text(
      "for the program. Please use the registration link provided to select your preferred participation dates and duration:",
      { align: "justify", width: textWidth }
    );

  doc.moveDown(0.8);
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").text(`Registration Code: ${regCode}`, {
    width: textWidth,
  });
  doc.font("Helvetica").text("", { continued: false });
  doc.font("Helvetica").text("", { continued: false });
  doc
    .font("Helvetica-Bold")
    .text("Registration Link:", { continued: true, width: textWidth });
  doc.font("Helvetica").text(" ", { continued: true });
  doc
    .fillColor("blue")
    .text("https://www.mirai-innovation-lab.com/miri-program-registration-form", {
      link: "https://www.mirai-innovation-lab.com/miri-program-registration-form",
      continued: false,
    })
    .fillColor("black");

  doc.moveDown(0.8);

  doc
    .font("Helvetica")
    .text("To confirm your participation, please ensure you ", {
      ...bodyOptions,
      continued: true,
    })
    .font("Helvetica-Bold")
    .text("complete your registration within 1 week", { continued: false })
    .text(" after receiving this acceptance letter.", bodyOptions);

  doc.moveDown(0.8);

  doc
    .font("Helvetica")
    .text(
      "After completing your registration, you will receive detailed information regarding the ",
      { align: "justify", width: textWidth, continued: true }
    )
    .font("Helvetica-Bold")
    .text("program venue, logistics, and preparation guidelines", {
      align: "justify",
      width: textWidth,
      continued: true,
    })
    .font("Helvetica")
    .text(
      ". Additionally, you will be scheduled for a ",
      { ...bodyOptions, continued: true }
    )
    .font("Helvetica-Bold")
    .text("new online meeting", { ...bodyOptions, continued: true })
    .font("Helvetica")
    .text(
      ", where we will discuss your potential project, provide guidance on how to prepare and acquire the necessary skills before beginning your MIRI training, and answer any questions you may have regarding your upcoming travel to Japan.",
      { ...bodyOptions, continued: false }
    );

  doc.moveDown(0.8);

  doc
    .font("Helvetica")
    .text(
      "We are excited to welcome you to Japan—a place where innovation, creativity, and cultural enrichment come together in inspiring ways. We trust that your experience at Mirai Innovation will expand your vision, strengthen your skills, and open meaningful opportunities for your professional and academic future.",
      bodyOptions
    );

  doc.moveDown(0.8);
  doc.text(
    "If you have any questions or require further assistance, please feel free to contact us.",
    bodyOptions
  );

  doc.moveDown(1.5);
  const centerTextX = (doc.page.width - textWidth) / 2;
  const cierreY = doc.y;

  const hankoPath = path.join(__dirname, "..", "public", "images", "hanko.png");
  const hankoImgSize = 54;
  const hankoImgOffsetY = 17;
  const hankoOffsetRight = 85;
  const hankoCenterX =
    doc.page.width / 2 + hankoOffsetRight - hankoImgSize / 2;

  if (fs.existsSync(hankoPath)) {
    const hankoCenterY = cierreY + hankoImgOffsetY;
    doc.image(hankoPath, hankoCenterX, hankoCenterY, {
      width: hankoImgSize,
      height: hankoImgSize,
    });
  }

  const cierreTextYOffset = 10;
  doc
    .fillColor("black")
    .font("Helvetica")
    .fontSize(11)
    .text("Evaluation Committee", centerTextX, cierreY + cierreTextYOffset, {
      align: "center",
      width: textWidth,
    });

  doc
    .font("Helvetica-Bold")
    .text("Mirai Innovation Research Institute", centerTextX, doc.y, {
      align: "center",
      width: textWidth,
    });

  const footerY = doc.page.height - 100;

  doc
    .strokeColor("#d1d5db")
    .lineWidth(0.5)
    .moveTo(72, footerY - 20)
    .lineTo(doc.page.width - 72, footerY - 20)
    .stroke();

  doc.fontSize(7.5).font("Helvetica").fillColor("#6b7280");
  doc.text(
    "[Lab Address] ATC blg, ITM sec. 6th floor Rm. M-1-3 Nankoukita 2-1-10, Suminoe-ku, Osaka, Japan. 559-0034.",
    72,
    footerY,
    { align: "center", width: textWidth }
  );
  doc.text("Tel.: +81 06-6616-7897", 72, footerY + 12, {
    align: "center",
    width: textWidth,
  });
  doc.text("www.mirai-innovation-lab.com", 72, footerY + 24, {
    align: "center",
    width: textWidth,
  });

  doc.end();
}
