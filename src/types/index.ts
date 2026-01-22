/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-08-18 17:21:19
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-08-20 02:21:28
 * @FilePath: /next_word_auto/src/types/index.ts
 * @Description: 
 * 
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved. 
 */

// 字段类型选项
export interface FieldConfig {
    id: string;
    name: string;
    type: 'text' | 'email' | 'number' | 'phone' | 'currency' | 'date' | 'select' | 'country';
    value: string | number | boolean;
    options?: string[]; // 用于select类型
    required?: boolean;
    format?: {
        currencySymbol?: string;
        decimalPlaces?: number;
        dateFormat?: string;
        numberFormat?: string;
    };
    countryLang?: import('@/constants/countries').CountryLang; // 国家字段：语言格式
    countryValue?: string; // 国家字段：选中的国家 code
}

// 云端模板接口
export interface CloudTemplate {
    name: string;
    pathname: string;
    url: string;
    size: number;
    uploadedAt: string;
}

export interface FeatureCardProps {
    title: string;
    description: string;
    href: string;
    icon: string;
    gradient: string;
}