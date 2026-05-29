'use client'
import React, {useCallback, useEffect, useRef, useState} from "react";
import api from "@/app/api";
import {toast, ToastContainer} from "react-toastify";

function formatToMoney(value: number | string) {
    if (isNaN(Number(value)) || value === "") return value
    return Number(value).toLocaleString('es-CO');
}

export interface FormType {
    A: string | number;
    B: number | string;
    C: string | number;
    formatEn?: boolean;
    goldStyle?: object;
    factorStyle?: object;
    entidadStyle?: object;
    factorEditable?: boolean;
}

export interface DataType {
    gold: number;
    gold_time?: string;
    gold_date: string;
    dolar: number;
    dolar_time?: string;
    dolar_date: string;
}

const defaultForm = [
    {A: "", B: 0, C: "89.5%"},
    {A: "", B: 0, C: "90.0%"},
    {A: "", B: 0, C: "90.5%"},
    {A: "", B: 0, C: "91.0%"},
    {A: "", B: 0, C: "91.5%"},
    {A: "", B: 0, C: "91.6%"},
    {A: "", B: 0, C: "91.7%"},
    {A: "", B: 0, C: "91.8%"},
    {A: "", B: 0, C: "91.9%"},
    {A: "", B: 0, C: "92.0%"},
    {A: "", B: 0, C: "93.0%"},
    {A: "", B: 0, C: "93.5%"},
    {A: "", B: 0, C: "94.0%"},
    {A: "", B: 0, C: "94.5%"},
    {A: "", B: 0, C: "97.8%"},
    {A: "", B: 0, C: "98.0%"},
    {A: "", B: 0, C: "98.3%"},
    {A: "", B: 0, C: "", factorEditable: true},
]

export default function Formulario() {
    const [isError, setIsError] = useState(false)
    let defaultwindow = false
    const dateNow = new Date().toLocaleTimeString()
    let DataDefault = {
        gold: 0,
        gold_time: dateNow,
        gold_date: "",
        dolar: 0,
        dolar_time: dateNow,
        dolar_date: ""
    }
    let extDataDefault = { xauCop: 0, goldUsdOz: 0, fecha: "" }
    if (typeof window !== "undefined") {
        defaultwindow = window.innerWidth <= 468
        if (localStorage.getItem('data')) {
            DataDefault = JSON.parse(localStorage.getItem('data') || JSON.stringify(DataDefault))
        }
        if (localStorage.getItem('extData')) {
            extDataDefault = JSON.parse(localStorage.getItem('extData') || JSON.stringify(extDataDefault))
        }
    }
    const [image, setImage] = useState(null)
    const [isMobile, setIsMobile] = useState(defaultwindow);
    const [timeScrenshot, setTimeScrenshot] = useState('')
    const [data, setData] = useState<DataType>(DataDefault)
    const [countdown, setCountdown] = useState(0)

    const [fix] = useState(31.1034768)
    const [dataForm, setDataForm] = useState<FormType[]>(defaultForm);
    const [extData, setExtData] = useState(extDataDefault)
    const defaultValue = "4333.00"

    const handleLogout = () => {
        if (window.confirm('¿Estás seguro que deseas cerrar sesión?')) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('authExpiry');
            window.location.reload();
        }
    };

    useEffect(() => {
        init()
        const metaViewport = document.createElement('meta');
        metaViewport.name = 'viewport';
        metaViewport.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
        document.head.appendChild(metaViewport);
        return () => { document.head.removeChild(metaViewport); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const originalTitle = document.title;
        const handleBlur = () => { document.title = "¡Vuelve pronto!"; };
        const handleFocus = () => { document.title = originalTitle; };
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.title = originalTitle;
        };
    }, [data.dolar]);

    const abortRef = useRef<AbortController | null>(null)
    const baseInterval = 10000
    const maxInterval = 60000
    const intervalRef = useRef(baseInterval)
    const lastDataRef = useRef<DataType | null>(null)
    const lastSaveRef = useRef(0)
    const nextExecutionRef = useRef(Date.now() + baseInterval)

    const saveIfChanged = (key: string, value: unknown, throttleMs = 2000) => {
        if (typeof window === 'undefined') return
        const now = Date.now()
        const prev = localStorage.getItem(key)
        const next = JSON.stringify(value)
        if (prev !== next && now - lastSaveRef.current > throttleMs) {
            localStorage.setItem(key, next)
            lastSaveRef.current = now
        }
    }

    const init = useCallback(async () => {
        const nowData = data
        const [gold, banco, ext] = await Promise.all([
            api.netData(),
            api.bancodebogota(),
            api.goldExternal(),
        ])

        nowData.gold = gold.mid
        nowData.gold_date = gold.time
        nowData.gold_time = new Date().toLocaleTimeString()

        nowData.dolar_time = new Date().toLocaleTimeString()
        nowData.dolar_date = banco.time
        if (banco.image) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setImage(banco.image.replace('..', ''))
        } else {
            setImage(null)
        }
        if (banco.mid === 0) {
            if (typeof window !== "undefined") {
                nowData.dolar = Number(localStorage.getItem('dolar') || defaultValue)
            }
            setIsError(true)
        } else {
            nowData.dolar = banco.mid
            setIsError(false)
            if (typeof window !== "undefined") {
                localStorage.setItem('dolar', String(banco.mid))
            }
        }

        if (ext.xauCop > 0 || ext.goldUsdOz > 0) {
            const next = { xauCop: ext.xauCop, goldUsdOz: ext.goldUsdOz, fecha: ext.fecha }
            setExtData(next)
            saveIfChanged('extData', next)
        }

        saveIfChanged('data', nowData)
        calculos(nowData)
    }, []);

    useEffect(() => {
        let handle: number | undefined
        let stopped = false

        const loop = async () => {
            if (document.visibilityState !== 'visible') return
            abortRef.current?.abort()
            const ctrl = new AbortController()
            abortRef.current = ctrl
            try {
                const before = JSON.stringify(lastDataRef.current)
                const [gold, banco, ext] = await Promise.all([
                    api.netData(ctrl.signal),
                    api.bancodebogota(ctrl.signal),
                    api.goldExternal(ctrl.signal),
                ])

                const nowData = {
                    ...data,
                    gold: gold.mid || data.gold,
                    gold_date: gold.time,
                    gold_time: new Date().toLocaleTimeString(),
                    dolar: banco.mid || data.dolar,
                    dolar_date: banco.time,
                    dolar_time: new Date().toLocaleTimeString(),
                } as DataType

                if (banco.image) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    setImage(banco?.image.replace('..', ''))
                } else {
                    setImage(null)
                }

                if (ext.xauCop > 0 || ext.goldUsdOz > 0) {
                    const next = { xauCop: ext.xauCop, goldUsdOz: ext.goldUsdOz, fecha: ext.fecha }
                    setExtData(next)
                    saveIfChanged('extData', next)
                }

                const after = JSON.stringify(nowData)
                const changed = before !== after
                if (changed) {
                    lastDataRef.current = nowData
                    saveIfChanged('data', nowData)
                    calculos(nowData)
                    intervalRef.current = baseInterval
                } else {
                    intervalRef.current = Math.min(maxInterval, intervalRef.current * 2)
                }
            } catch (e) {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                if (e?.name !== 'AbortError') {
                    intervalRef.current = Math.min(maxInterval, intervalRef.current * 2)
                }
            } finally {
                if (!stopped && document.visibilityState === 'visible') {
                    nextExecutionRef.current = Date.now() + intervalRef.current
                    handle = window.setTimeout(loop, intervalRef.current)
                }
            }
        }

        const onVisibility = () => {
            if (document.visibilityState === 'visible') {
                if (handle) clearTimeout(handle)
                loop().then()
            } else {
                if (handle) clearTimeout(handle)
                abortRef.current?.abort()
            }
        }

        document.addEventListener('visibilitychange', onVisibility)
        loop().then()
        return () => {
            stopped = true
            if (handle) clearTimeout(handle)
            abortRef.current?.abort()
            document.removeEventListener('visibilitychange', onVisibility)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const countdownInterval = setInterval(() => {
            const remaining = Math.max(0, nextExecutionRef.current - Date.now())
            setCountdown(Math.ceil(remaining / 1000))
        }, 1000)
        return () => clearInterval(countdownInterval)
    }, [])

    const calculos = (nowData: DataType) => {
        setData({...nowData})
        const newDataForm = dataForm.map((row) => ({...row}))
        const multi = ((Number(nowData.gold) * Number(nowData.dolar)) / fix) * 1000
        for (let i = 0; i <= newDataForm.length - 1; i++) {
            const porcentaje = Number(String(newDataForm[i].C).replace('%', ''))
            newDataForm[i].B = String(Math.floor(multi * porcentaje / 100))
        }
        const prev = JSON.stringify(dataForm)
        const next = JSON.stringify(newDataForm)
        if (prev !== next) {
            saveIfChanged('dataForm', newDataForm)
            setDataForm(newDataForm)
        }
    }

    useEffect(() => {
        const handleResize = () => { setIsMobile(window.innerWidth <= 468); };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    const captureRef = useRef<HTMLDivElement>(null);

    const handleCapture = async () => {
        if (captureRef.current) {
            try {
                const {default: html2canvas} = await import('html2canvas')
                const canvas = await html2canvas(captureRef.current);
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        if (isMobile) {
                            const file = new File([blob], "screenshot.png", {type: "image/png"}) as File;
                            const shareData = {files: [file], title: "Precio", text: ""};
                            if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
                                try {
                                    await navigator.share(shareData);
                                    toast.success("Imagen compartida exitosamente");
                                } catch (error) {
                                    if ((error as Error).name !== 'AbortError') {
                                        toast.error("Error al compartir la imagen");
                                    }
                                }
                            } else {
                                toast.info("Descargando imagen...");
                                const dataUrl = canvas.toDataURL("image/png");
                                const link = document.createElement("a");
                                link.href = dataUrl;
                                link.download = "screenshot.png";
                                link.click();
                            }
                        } else {
                            try {
                                const item = new ClipboardItem({"image/png": blob});
                                await navigator.clipboard.write([item]);
                                toast.success("Imagen copiada al portapapeles");
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                            } catch (error) {
                                toast.error("Error al copiar la imagen al portapapeles");
                            }
                        }
                    }
                }, "image/png");
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                toast.error("Error al capturar la pantalla");
            }
        }
        setTimeScrenshot('')
    };


    return (
        <>
            <ToastContainer theme="dark"/>
            <div className="dashboard-layout">

                {/* ── Header ── */}
                <header className="dashboard-header">
                    <div className="header-brand">

                    </div>
                    <div className="header-right">
                        <div className="status-indicator">
                            <span className="status-dot-wrapper">
                                <span className="status-dot-ping"/>
                                <span className="status-dot-solid"/>
                            </span>
                            <span>{/*Actualización:*/} <strong>{countdown}s</strong></span>
                        </div>
                        <button className="btn-logout" onClick={handleLogout}>SALIR</button>
                    </div>
                </header>

                <div className="dashboard-main">

                    {/* ── Primary 4 cards ── */}
                    <section className="primary-grid">

                        {/* Card 1: Banco de Bogotá */}
                        <div className="primary-card">
                            <div className="primary-card-header">
                                <span className="card-label">Banco de Bogotá</span>
                                <span className={`card-badge ${isError ? 'badge-error' : 'badge-live'}`}>
                                    {isError ? 'ERROR' : 'LIVE'}
                                </span>
                            </div>
                            {isError ? (
                                <input
                                    type="number"
                                    name="bancodebogota"
                                    placeholder="4333"
                                    autoComplete="off"
                                    value={data.dolar || ''}
                                    className="primary-input"
                                    onChange={(e) => {
                                        const nowData = {...data}
                                        nowData.dolar = Number(e.target.value || 0)
                                        setData({...nowData})
                                        calculos(nowData)
                                        if (typeof window !== "undefined") {
                                            localStorage.setItem('dolar', String(e.target.value || defaultValue))
                                        }
                                    }}
                                />
                            ) : (
                                <div className="primary-value-row">
                                    <span className="primary-value">{formatToMoney(data.dolar)}</span>
                                    <span className="primary-unit">COP</span>
                                </div>
                            )}
                            <p className="primary-meta">
                                {image && (
                                    <img src={`https://pbit.bancodebogota.com${image}`} alt="indicador"/>
                                )}
                                {data.dolar_time}{data.dolar_date ? ` · ${data.dolar_date}` : ''}
                            </p>
                        </div>

                        {/* Card 2: Net Dania */}
                        <div className="primary-card">
                            <div className="primary-card-header">
                                <span className="card-label">Net Dania</span>
                                <span className="card-badge badge-global">USD/OZ</span>
                            </div>
                            <div className="primary-value-row">
                                <span className="primary-value">{data.gold || extData.goldUsdOz || '—'}</span>
                                <span className="primary-unit">USD/OZ</span>
                            </div>
                            <p className="primary-meta">
                                {data.gold_time}{data.gold_date ? ` · ${data.gold_date}` : ''}
                            </p>
                        </div>

                        {/* Card 3: Gold Price COP/OZ */}
                        <div className="primary-card">
                            <div className="primary-card-header">
                                <span className="card-label">Gold Price</span>
                                <span className="card-badge badge-calc">COP/OZ</span>
                            </div>
                            <div className="primary-value-row">
                                <span className="primary-value">
                                    {extData.xauCop > 0 ? formatToMoney(extData.xauCop) : '—'}
                                </span>
                            </div>
                            <p className="primary-meta">{extData.fecha || ''}</p>
                        </div>

                        {/* Card 4: Gold Price USD/OZ */}
                        <div className="primary-card">
                            <div className="primary-card-header">
                                <span className="card-label">Gold Price</span>
                                <span className="card-badge badge-global">USD/OZ</span>
                            </div>
                            <div className="primary-value-row">
                                <span className="primary-value">
                                    {extData.goldUsdOz > 0 ? extData.goldUsdOz : '—'}
                                </span>
                            </div>
                            <p className="primary-meta">{extData.fecha || ''}</p>
                        </div>

                    </section>

                    {/* ── Indicator grid (screenshot area) ── */}
                    <div ref={captureRef} className="screenshot-area">
                        {timeScrenshot !== "" && (
                            <div className="screenshot-timestamp">📅 {timeScrenshot}</div>
                        )}
                        <p className="indicator-section-title">Tabla de Porcentajes</p>
                        <div className="indicator-grid">
                            {dataForm.map((row, index) => (
                                <div key={index} className="indicator-card">
                                    <div className="indicator-left">
                                        {row.factorEditable ? (
                                            <input
                                                type="number"
                                                value={row.C}
                                                autoComplete="off"
                                                placeholder="0.0"
                                                className="indicator-input"
                                                onChange={(e) => {
                                                    dataForm[index].C = e.target.value
                                                    setDataForm([...dataForm])
                                                    calculos(data)
                                                }}
                                            />
                                        ) : (
                                            <p className="indicator-percent">{row.C}</p>
                                        )}
                                    </div>
                                    <div className="indicator-right">
                                        {/*<p className="indicator-sublabel">COP / GRAMO</p>*/}
                                        <p className="indicator-value">
                                            {formatToMoney(Math.floor(Number(row.B) / 1000))}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Action button ── */}
                    {/*<div className="action-section">*/}
                    {/*    <button*/}
                    {/*        className="btn-report"*/}
                    {/*        onClick={() => {*/}
                    {/*            setTimeScrenshot(`${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}`)*/}
                    {/*            setTimeout(() => { handleCapture().then() }, 500)*/}
                    {/*        }}*/}
                    {/*    >*/}
                    {/*        <svg className="btn-report-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">*/}
                    {/*            <path*/}
                    {/*                d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"*/}
                    {/*                strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>*/}
                    {/*        </svg>*/}
                    {/*        {isMobile ? 'COMPARTIR REPORTE' : 'COPIAR REPORTE'}*/}
                    {/*    </button>*/}
                    {/*</div>*/}
                </div>

                <footer className="dashboard-footer">
                    InfoGold Systems · Enterprise Edition · v1.1
                </footer>
            </div>
        </>
    );
}
