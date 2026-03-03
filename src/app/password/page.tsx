/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2024-11-06 18:25:07
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-08-16 03:34:19
 * @FilePath: /next_word_auto/src/app/password/page.tsx
 * @Description: 
 * 
 * Copyright (c) 2024 by ${git_name_email}, All Rights Reserved. 
 */


'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";


export default function PasswordPage() {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); // Clear previous errors

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await response.json();

            if (data.success) {
                router.push("/"); // Redirect to home on successful login
            } else {
                setError(data.message || "Incorrect password. Please try again.");
            }
        } catch (err: unknown) {
            console.error('Login error:', err);
            setError("An error occurred while trying to log in. Please try again.");
        }
    };

    return (
        <main style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: "5rem", fontFamily: "Arial, sans-serif" }}>
            <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Enter Password</h1>
            <form onSubmit={handlePasswordSubmit} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                        padding: "0.5rem",
                        marginBottom: "1rem",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        fontSize: "1rem",
                    }}
                    placeholder="Enter password"
                />
                <button
                    type="submit"
                    style={{
                        padding: "0.5rem 1rem",
                        backgroundColor: "#0070f3",
                        color: "white",
                        fontSize: "1rem",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                    }}
                >
                    Submit
                </button>
            </form>
            {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}
        </main>
    );
}