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
    const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [recordId, setRecordId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<FormDataType>(() => ({
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
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
        const day = String(date.getDate()).padStart(2, '0');
        return `${month} ${day}, ${year}`;
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
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get("Content-Type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                throw new Error(errorData.error || "PDF生成失败");
            }

            const blob = await response.blob();
            saveAs(blob, `Lulab_invioce_${formattedData.name}.pdf`);
        } catch (error) {
            console.error("PDF生成失败:", error);
            alert(error instanceof Error ? error.message : "PDF生成失败，请稍后重试");
        } finally {
            setIsGeneratingPdf(false); // 重新启用按钮
        }
    };
    return (
        <main className="min-h-screen py-8 px-4 bg-gray-50">
            <div className="max-w-2xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-gray-800 text-center">Generate Admission Offer Letter</h1>
                
                <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="w-full max-w-md mx-auto block py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 ease-in-out shadow-sm"
                >
                    输入记录ID
                </button>

                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl transform transition-all animate-slide-up">
                            <h2 className="text-xl font-semibold text-gray-800 mb-4">输入记录ID</h2>
                            <input
                                type="text"
                                value={recordId}
                                onChange={(e) => setRecordId(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-black"
                                placeholder="请输入记录ID"
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowModal(false);
                                        setRecordId("");
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!recordId.trim()) {
                                            alert("请输入记录ID");
                                            return;
                                        }
                                        setIsLoading(true);
                                        try {
                                            const response = await fetch("/api/token", {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json"
                                                },
                                                body: JSON.stringify({ recordId })
                                            });
                                            const data = await response.json();
                                            console.log("飞书API响应:", data);
                                            
                                            // 如果成功获取数据，自动填充表单
                                            if (data.data && data.data.items && data.data.items.length > 0) {
                                                const fields = data.data.items[0].fields;
                                                const newFormData = {
                                                    name: fields.name?.[0]?.text || "",
                                                    country: fields.country?.[0]?.text || "China",
                                                    state: fields.state?.[0]?.text || "",
                                                    city: fields.city?.[0]?.text || "",
                                                    postalCode: fields.postalCode?.[0]?.text || "",
                                                    address: fields.address?.[0]?.text || "",
                                                    studentID: fields.studentID?.[0]?.text || "",
                                                    programName: fields.programName?.[0]?.text || "Practical Training Club",
                                                    issuanceDate: fields.issuanceDate ? new Date(fields.issuanceDate).toISOString().split('T')[0] : "",
                                                    startDate: fields.startDate ? new Date(fields.startDate).toISOString().split('T')[0] : "",
                                                    endDate: fields.endDate ? new Date(fields.endDate).toISOString().split('T')[0] : "",
                                                    tuitionFeeUSD: fields.tuitionFeeUSD?.[0]?.text || ""
                                                };
                                                setFormData(newFormData);
                                            }
                                        } catch (error) {
                                            console.error("获取访问令牌失败:", error);
                                        } finally {
                                            setIsLoading(false);
                                            setShowModal(false);
                                            setRecordId("");
                                        }
                                    }}
                                    disabled={isLoading}
                                    className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? "加载中..." : "确定"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <form className="space-y-6 bg-white p-6 rounded-lg shadow-sm">
                    {Object.keys(formData).map((key) => (
                        <div key={key} className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">{key}</label>
                            {key === "country" ? (
                                <select
                                    name={key}
                                    value={formData.country}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-black"
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
                                    value={(formData as unknown as Record<string, string>)[key]}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 text-black"
                                />
                            )}
                        </div>
                    ))}
                    
                    <div className="space-y-4 pt-4">
                        <button
                            type="button"
                            onClick={generateDocument}
                            disabled={isGeneratingDocx}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${isGeneratingDocx ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`}
                        >
                            {isGeneratingDocx ? "Generating..." : "Generate Document"}
                        </button>
                        
                        <button
                            type="button"
                            onClick={generatePdf}
                            disabled={isGeneratingPdf}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${isGeneratingPdf ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'}`}
                        >
                            {isGeneratingPdf ? "Generating..." : "PDF Document"}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out;
                }
                
                .animate-slide-up {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </main>
    );
}
