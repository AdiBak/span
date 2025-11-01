import React, { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import './ImpactMap.css'

const STATE_NAME_TO_CODE = {
  "Alabama": "US-AL",
  "Alaska": "US-AK",
  "Arizona": "US-AZ",
  "Arkansas": "US-AR",
  "California": "US-CA",
  "Colorado": "US-CO",
  "Connecticut": "US-CT",
  "Delaware": "US-DE",
  "Florida": "US-FL",
  "Georgia": "US-GA",
  "Hawaii": "US-HI",
  "Idaho": "US-ID",
  "Illinois": "US-IL",
  "Indiana": "US-IN",
  "Iowa": "US-IA",
  "Kansas": "US-KS",
  "Kentucky": "US-KY",
  "Louisiana": "US-LA",
  "Maine": "US-ME",
  "Maryland": "US-MD",
  "Massachusetts": "US-MA",
  "Michigan": "US-MI",
  "Minnesota": "US-MN",
  "Mississippi": "US-MS",
  "Missouri": "US-MO",
  "Montana": "US-MT",
  "Nebraska": "US-NE",
  "Nevada": "US-NV",
  "New Hampshire": "US-NH",
  "New Jersey": "US-NJ",
  "New Mexico": "US-NM",
  "New York": "US-NY",
  "North Carolina": "US-NC",
  "North Dakota": "US-ND",
  "Ohio": "US-OH",
  "Oklahoma": "US-OK",
  "Oregon": "US-OR",
  "Pennsylvania": "US-PA",
  "Rhode Island": "US-RI",
  "South Carolina": "US-SC",
  "South Dakota": "US-SD",
  "Tennessee": "US-TN",
  "Texas": "US-TX",
  "Utah": "US-UT",
  "Vermont": "US-VT",
  "Virginia": "US-VA",
  "Washington": "US-WA",
  "West Virginia": "US-WV",
  "Wisconsin": "US-WI",
  "Wyoming": "US-WY",
  "District of Columbia": "US-DC"
}

function ImpactMap() {
  const chartDivRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const chartRef = useRef(null)
  const [stateCounts, setStateCounts] = useState({})

  // Load Google Charts and initialize - runs after component renders
  useEffect(() => {
    // Wait for React to render the div first
    if (!chartDivRef.current) {
      // Component hasn't rendered yet, wait and retry
      const checkRef = setInterval(() => {
        if (chartDivRef.current) {
          clearInterval(checkRef)
          initGoogleCharts()
        }
      }, 50)

      setTimeout(() => {
        clearInterval(checkRef)
        if (!chartDivRef.current) {
          setError('Failed to initialize map')
          setLoading(false)
        }
      }, 2000)

      return () => clearInterval(checkRef)
    } else {
      initGoogleCharts()
    }

    function initGoogleCharts() {
      // Check if Google Charts is already loaded (might be loaded by index.html)
      if (window.google && window.google.charts) {
        if (window.google.visualization) {
          // Already fully loaded, initialize chart
          initializeChart()
        } else {
          // Charts loader is loaded but not initialized yet
          window.google.charts.load('current', {
            packages: ['geochart']
          })
          window.google.charts.setOnLoadCallback(() => {
            initializeChart()
          })
        }
      } else {
        // Wait for script from index.html to load, or load it ourselves
        const checkForGoogle = setInterval(() => {
          if (window.google && window.google.charts) {
            clearInterval(checkForGoogle)
            window.google.charts.load('current', {
              packages: ['geochart']
            })
            window.google.charts.setOnLoadCallback(() => {
              initializeChart()
            })
          }
        }, 100)

        // Timeout after 5 seconds
        setTimeout(() => {
          clearInterval(checkForGoogle)
          if (!window.google || !window.google.charts) {
            console.error('Google Charts failed to load')
            setError('Failed to load map library')
            setLoading(false)
          }
        }, 5000)
      }
    }

    // Handle window resize
    const handleResize = () => {
      if (chartRef.current && chartDivRef.current && stateCounts && Object.keys(stateCounts).length > 0) {
        drawChart()
      }
    }
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // This effect is handled by initializeChart calling fetchBillsAndDraw
  // No separate effect needed here

  async function fetchBillsAndDraw() {
    try {
      setLoading(true)
      const { data: bills, error: fetchError } = await supabase
        .from('bills')
        .select('state')

      if (fetchError) throw fetchError

      // Count bills by state
      const counts = {}
      for (const bill of bills || []) {
        if (bill.state) {
          counts[bill.state] = (counts[bill.state] || 0) + 1
        }
      }
      setStateCounts(counts)

      // Wait for both Google Charts and the chart div to be ready
      const attemptDraw = (attempts = 0) => {
        if (window.google && window.google.visualization && chartDivRef.current) {
          drawChart(counts)
          setLoading(false)
        } else if (attempts < 20) {
          // Retry up to 20 times (2 seconds total)
          setTimeout(() => attemptDraw(attempts + 1), 100)
        } else {
          console.error('Failed to draw chart:', {
            hasGoogle: !!window.google,
            hasVisualization: !!(window.google && window.google.visualization),
            hasDiv: !!chartDivRef.current
          })
          setError('Failed to render map. Please refresh the page.')
          setLoading(false)
        }
      }
      attemptDraw()
    } catch (err) {
      console.error('Error fetching bills:', err)
      setError('Failed to load map data')
      setLoading(false)
    }
  }

  function initializeChart() {
    // Wait a bit for the chart div to be ready, then fetch and draw
    // Try multiple times in case React hasn't mounted the ref yet
    const tryInit = (attempts = 0) => {
      if (chartDivRef.current) {
        fetchBillsAndDraw()
      } else if (attempts < 10) {
        setTimeout(() => tryInit(attempts + 1), 100)
      } else {
        console.error('Chart div not found after multiple attempts')
        setError('Failed to initialize map')
        setLoading(false)
      }
    }
    tryInit()
  }

  function drawChart(counts = stateCounts) {
    if (!chartDivRef.current || !window.google || !window.google.visualization) {
      return
    }

    const dataArray = [
      ['State', 'HasBill', { role: 'tooltip' }]
    ]

    for (const [stateName, count] of Object.entries(counts)) {
      const stateCode = STATE_NAME_TO_CODE[stateName]
      if (stateCode) {
        const tooltip = `${count === 1 ? '1 bill impacted' : `${count} bills impacted`}`
        dataArray.push([stateName, 1, tooltip])
      }
    }

    const data = window.google.visualization.arrayToDataTable(dataArray)

    const options = {
      region: 'US',
      displayMode: 'regions',
      resolution: 'provinces',
      backgroundColor: 'transparent',
      defaultColor: '#e9ecef',
      datalessRegionColor: '#f8f9fa',
      colorAxis: {
        values: [0, 1],
        colors: ['#f8f9fa', '#003049']
      },
      tooltip: {
        isHtml: false,
        textStyle: {
          fontName: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: 14,
          color: '#212529'
        }
      },
      legend: 'none'
    }

    if (!chartRef.current) {
      chartRef.current = new window.google.visualization.GeoChart(chartDivRef.current)
    }

    chartRef.current.draw(data, options)

    // Add interactivity
    window.google.visualization.events.removeAllListeners(chartRef.current)

    window.google.visualization.events.addListener(chartRef.current, 'regionMouseOver', (event) => {
      const regionCode = event.region
      const hasBills = Object.keys(counts).some(
        (state) => STATE_NAME_TO_CODE[state] === regionCode
      )
      if (chartDivRef.current) {
        chartDivRef.current.style.cursor = hasBills ? 'pointer' : 'default'
      }
    })

    window.google.visualization.events.addListener(chartRef.current, 'regionMouseOut', () => {
      if (chartDivRef.current) {
        chartDivRef.current.style.cursor = 'default'
      }
    })

    window.google.visualization.events.addListener(chartRef.current, 'regionClick', (event) => {
      const regionCode = event.region
      const matchedState = Object.keys(counts).find(
        (state) => STATE_NAME_TO_CODE[state] === regionCode
      )
      if (matchedState) {
        window.location.href = `/bills.html?search=${encodeURIComponent(matchedState)}`
      }
    })
  }

  return (
    <div className="impact-map-container">
      {loading && (
        <div className="text-center py-5 position-absolute top-50 start-50 translate-middle">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading map...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="alert alert-warning" role="alert">
          {error}
        </div>
      )}
      <div ref={chartDivRef} className="impact-map" style={{ visibility: loading ? 'hidden' : 'visible' }}></div>
    </div>
  )
}

export default ImpactMap

