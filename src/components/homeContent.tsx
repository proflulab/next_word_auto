/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2024-11-06 18:28:01
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2024-11-06 18:53:34
 * @FilePath: /next_word_auto/src/components/HomeContent.tsx
 * @Description: 
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
 */
'use client';

import { useState } from "react";

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
    const [formData, setFormData] = useState<FormDataType>({
        name: "",                     // 姓名
        country: "China",     // 国家，默认值
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

    const [generating, setGenerating] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date');
            }
            
            const months = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            
            const day = date.getDate();
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            
            // Format: "December 7, 2024"
            return `${month} ${day}, ${year}`;
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateString; // 返回原始日期字符串以防格式化失败
        }
    };

    const generateDocument = async () => {
        if (generating) return;

        try {
            // 验证所有必填字段
            const requiredFields = [
                'name', 'country', 'state', 'city', 'postalCode',
                'address', 'studentID', 'programName', 'issuanceDate',
                'startDate', 'endDate', 'tuitionFeeUSD'
            ];

            const missingFields = requiredFields.filter(field => !formData[field as keyof FormDataType]);
            if (missingFields.length > 0) {
                throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`);
            }
            
            setGenerating(true);

            // 验证日期格式
            const dateFields = ['issuanceDate', 'startDate', 'endDate'];
            for (const field of dateFields) {
                const dateValue = formData[field as keyof FormDataType];
                if (!dateValue) {
                    throw new Error(`${field} is required`);
                }
                const date = new Date(dateValue);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid date format for ${field}`);
                }
            }

            // 格式化日期
            const formattedData = {
                ...formData,
                issuanceDate: formatDate(formData.issuanceDate),
                startDate: formatDate(formData.startDate),
                endDate: formatDate(formData.endDate),
            };

            console.log('Formatted data:', formattedData); // 添加日志以检查格式化后的数据

            const response = await fetch("/api/generate_document", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formattedData),
            });

            const contentType = response.headers.get("content-type");
            
            if (!response.ok) {
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to generate document');
                }
                throw new Error(`Server error: ${response.status}`);
            }

            if (!contentType || !contentType.includes('application/pdf')) {
                throw new Error('Server did not return a PDF file');
            }

            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition
                ? contentDisposition.split('filename=')[1].replace(/"/g, '')
                : `Lulab_invoice_${formData.name}.pdf`;

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error generating document:", error);
            alert(error instanceof Error ? error.message : "An unexpected error occurred");
        } finally {
            setGenerating(false);
        }
    };

    const getAutoComplete = (key: string): string => {
        switch (key) {
            case 'name':
                return 'name';
            case 'address':
                return 'street-address';
            case 'city':
                return 'address-level2';
            case 'state':
                return 'address-level1';
            case 'country':
                return 'country';
            case 'postalCode':
                return 'postal-code';
            case 'studentID':
                return 'username';
            default:
                return 'off';
        }
    };

    return (
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", fontFamily: "Arial, sans-serif", marginTop: "2rem" }}>
            <h1 style={{ fontSize: "2rem", color: "#333", marginBottom: "1rem" }}>Generate Admission Offer Letter</h1>
            <form 
                style={{ maxWidth: "500px", width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}
                aria-label="Document generation form"
            >
                {Object.entries(formData).map(([key, value]) => {
                    const fieldId = `field-${key}`;
                    // 特殊处理 ID 和 USD
                    const labelText = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase())
                        .replace(/\bId\b/gi, 'ID')
                        .replace(/\bUsd\b/gi, 'USD');
                    
                    return (
                        <div key={key} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            <label 
                                htmlFor={fieldId}
                                style={{ fontWeight: "bold", color: "#555" }}
                            >
                                {labelText}
                            </label>
                            {key === "country" ? (
                                <select
                                    id={fieldId}
                                    name={key}
                                    value={value}
                                    onChange={handleChange}
                                    aria-label="Select country"
                                    title="Select your country"
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
                                    id={fieldId}
                                    type={key.includes("Date") ? "date" : "text"}
                                    name={key}
                                    value={value}
                                    onChange={handleChange}
                                    placeholder={`Enter ${labelText.toLowerCase()}`}
                                    title={`Enter ${labelText.toLowerCase()}`}
                                    aria-label={labelText}
                                    autoComplete={getAutoComplete(key)}
                                    required
                                    style={{
                                        padding: "0.5rem",
                                        borderRadius: "4px",
                                        border: "1px solid #ccc",
                                        fontSize: "1rem",
                                        width: "100%",
                                        textSizeAdjust: "100%",
                                    }}
                                />
                            )}
                        </div>
                    );
                })}
                <button
                    type="button"
                    onClick={generateDocument}
                    disabled={generating}
                    aria-label={generating ? "Generating document..." : "Generate PDF document"}
                    style={{
                        padding: "0.75rem",
                        backgroundColor: generating ? "#ccc" : "#0070f3",
                        color: "white",
                        fontSize: "1rem",
                        border: "none",
                        borderRadius: "4px",
                        cursor: generating ? "not-allowed" : "pointer",
                        marginTop: "1rem",
                    }}
                >
                    {generating ? "Generating..." : "Generate PDF"}
                </button>
            </form>
        </main>
    );
}