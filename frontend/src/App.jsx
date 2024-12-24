import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import { API_URL } from './config'

function App() {
  const [videos, setVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)

  useEffect(() => {
    axios.get(`${API_URL}/api/videos`)
      .then(response => {
        setVideos(response.data)
        if (response.data.length > 0) {
          setSelectedVideo(response.data[0])
        }
      })
      .catch(error => console.error('Error:', error))
  }, [])

  return (
    <>
      <nav className="navbar">
        <h1>VideoTube</h1>
      </nav>
      
      <div className="app">
        <div className="content">
          <div className="video-main">
            <div className="video-container">
              {selectedVideo && (
                <video 
                  controls 
                  autoPlay
                  key={selectedVideo}
                >
                  <source 
                    src={`${API_URL}/api/video/${selectedVideo}`} 
                    type="video/mp4"
                  />
                  Tu navegador no soporta el elemento video.
                </video>
              )}
            </div>
            
            {selectedVideo && (
              <div className="video-info">
                <h2 className="video-title">
                  {selectedVideo.replace(/\.[^/.]+$/, "")}
                </h2>
              </div>
            )}
          </div>

          <div className="video-list">
            <h2>Videos Sugeridos</h2>
            {videos.map(video => (
              <div 
                key={video} 
                className={`video-item ${selectedVideo === video ? 'active' : ''}`}
                onClick={() => setSelectedVideo(video)}
              >
                {video.replace(/\.[^/.]+$/, "")}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default App
