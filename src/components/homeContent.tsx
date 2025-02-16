'use client';

import { saveAs } from "file-saver";
import React, { useState } from "react";
// 定义 formData 的类型
interface FormDataType {
    issuanceDate: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    name: string;
    studentID: string;
    programName: string;
    startDate: string;
    endDate: string;
    tuitionFeeUSD: string;
}

// 所有国家名称列表
const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria",
    "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon",
    "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia",
    "Cuba", "Cyprus", "Czech Republic", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador",
    "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia",
    "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan",
    "Kenya", "Kiribati", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein",
    "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania",
    "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia",
    "Norway", "Oman", "Pakistan", "Palau", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa",
    "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore",
    "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka",
    "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo",
    "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates",
    "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
    "Zambia", "Zimbabwe"
];

export default function HomeContent() {
    const [isGeneratingDocx, setIsGeneratingDocx] = useState(false); // 控制 .docx 按钮
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);   // 控制 PDF 按钮
    const [formData, setFormData] = useState<FormDataType>({
        name: "",                     // 姓名
        country: "China",             // 国家，默认值
        state: "",                    // 省份
        city: "",                     // 城市
        postalCode: "",               // 邮编
        address: "",                  // 详细地址
        studentID: "",                // 学生学号
        programName: "Practical Training Club",  // 项目名称
        issuanceDate: "",             // 发放时间
        startDate: "",                // 开始时间
        endDate: "",                  // 结束时间
        tuitionFeeUSD: "",            // 实际价格（美元）
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const formatDate = (dateString: string) => {
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: '2-digit' };
        return new Date(dateString).toLocaleDateString('en-US', options);
    };

    const generateDocument = async () => {
        setIsGeneratingDocx(true); // 禁用按钮
        const formattedData = {
            ...formData,
            issuanceDate: formatDate(formData.issuanceDate),
            startDate: formatDate(formData.startDate),
            endDate: formatDate(formData.endDate),
        };
    
        try {
            const response = await fetch("/api/generate_document", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formattedData),
            });
            const blob = await response.blob();
            saveAs(blob, "Lulab_invioce_" + formattedData.name + ".docx");
        } catch (error) {
            console.error("Error generating document:", error);
        } finally {
            setIsGeneratingDocx(false); // 重新启用按钮
        }
    };
    const generatePdf = async () => {
        setIsGeneratingPdf(true); // 禁用按钮
        const formattedData = {
            ...formData,
            issuanceDate: formatDate(formData.issuanceDate),
            startDate: formatDate(formData.startDate),
            endDate: formatDate(formData.endDate),
        };
    
        try {
            const response = await fetch("/api/pdf_document", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formattedData),
            });
    
            if (!response.ok) {
                throw new Error("Failed to generate PDF");
            }
    
            const blob = await response.blob();
            saveAs(blob, "Lulab_invioce_" + formattedData.name + ".pdf");
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsGeneratingPdf(false); // 重新启用按钮
        }
    };
    return (
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Arial, sans-serif", marginTop: "2rem" }}>
            <h1 style={{ fontSize: "2rem", color: "#333", marginBottom: "1rem" }}>Generate Admission Offer Letter</h1>
            <form style={{ maxWidth: "500px", width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
                {Object.keys(formData).map((key) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <label style={{ fontWeight: "bold", color: "#555" }}>{key}</label>
                        {key === "country" ? (
                            <select
                                name={key}
                                value={formData.country}
                                onChange={handleChange}
                                style={{
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                    border: "1px solid #ccc",
                                    fontSize: "1rem",
                                }}
                            >
                                {countries.map((country) => (
                                    <option key={country} value={country}>
                                        {country}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={key.includes("Date") ? "date" : "text"}
                                name={key}
                                value={(formData as unknown as Record<string, string>)[key]} // 使用类型断言替代 any
                                onChange={handleChange}
                                style={{
                                    padding: "0.5rem",
                                    borderRadius: "4px",
                                    border: "1px solid #ccc",
                                    fontSize: "1rem",
                                    width: "100%",
                                }}
                            />
                        )}
                    </div>
                ))}
            <button
                    type="button"
                    onClick={generateDocument}
                    disabled={isGeneratingDocx} // 禁用按钮
                    style={{
                        padding: "0.75rem",
                        backgroundColor: isGeneratingDocx ? "#ccc" : "#0070f3", // 加载时改变颜色
                        color: "white",
                        fontSize: "1rem",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isGeneratingDocx ? "not-allowed" : "pointer", // 加载时改变光标
                        marginTop: "1rem",
                    }}
                >
                    {isGeneratingDocx ? "Generating..." : "Generate Document"} 
                </button>
                <button
                    type="button"
                    onClick={generatePdf}
                    disabled={isGeneratingPdf} // 禁用按钮
                    style={{
                        padding: "0.75rem",
                        backgroundColor: isGeneratingPdf ? "#ccc" : "#0070f3", // 加载时改变颜色
                        color: "white",
                        fontSize: "1rem",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isGeneratingPdf ? "not-allowed" : "pointer", // 加载时改变光标
                        marginTop: "1rem",
                    }}
                >
                    {isGeneratingPdf ? "Generating..." : "PDF Document"} 
                </button>
            </form>
        </main>
    );
}