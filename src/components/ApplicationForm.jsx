import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { COUNTRY_SUGGESTIONS } from '../data/countryOptions'

// Create an anonymous client for public application submissions
// This ensures we never use an authenticated session
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const anonymousSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})

function ApplicationForm() {
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    fullName: '',
    age: '',
    grade: '',
    gradeOther: '',
    school: '',
    country: 'United States',
    state: '',
    hoursPerWeek: '',
    additionalInfo: '',
    referralSource: '',
    referralSourceOther: '',
    referralFriendName: '',
    linkedinUrl: '',
    instagramUrl: ''
  })
  const [resumeFile, setResumeFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const FRIEND_REFERRAL = 'A friend or classmate'

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'referralSource') {
        if (value !== 'Other') next.referralSourceOther = ''
        if (value !== FRIEND_REFERRAL) next.referralFriendName = ''
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess(false)

    // Determine grade value (use "Other" text if grade is "Other")
    const gradeValue = formData.grade === 'Other' ? formData.gradeOther : formData.grade
    const referralValue = formData.referralSource === 'Other' ? formData.referralSourceOther : formData.referralSource

    // Validation
    const countryTrim = formData.country.trim()
    const isUnitedStates = /^united states$/i.test(countryTrim)

    if (!formData.email || !formData.phoneNumber || !formData.fullName || !formData.age ||
        !formData.grade || !formData.school || !countryTrim || !formData.hoursPerWeek || !formData.referralSource) {
      setSubmitError('Please fill in all required fields.')
      setSubmitting(false)
      return
    }

    if (isUnitedStates && !formData.state.trim()) {
      setSubmitError('Please enter your U.S. state.')
      setSubmitting(false)
      return
    }

    const ageNum = parseInt(String(formData.age).trim(), 10)
    if (Number.isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      setSubmitError('Please enter a valid age (13–120).')
      setSubmitting(false)
      return
    }

    if (formData.grade === 'Other' && !formData.gradeOther.trim()) {
      setSubmitError('Please specify your grade.')
      setSubmitting(false)
      return
    }

    if (formData.referralSource === 'Other' && !formData.referralSourceOther.trim()) {
      setSubmitError('Please specify how you heard about SPAN.')
      setSubmitting(false)
      return
    }

    if (formData.referralSource === FRIEND_REFERRAL && !formData.referralFriendName.trim()) {
      setSubmitError('Please enter the name of the friend or classmate who told you about SPAN.')
      setSubmitting(false)
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setSubmitError('Please enter a valid email address.')
      setSubmitting(false)
      return
    }

    try {
      let resumeFileName = null

      // Upload resume if provided
      if (resumeFile) {
        const fileExt = resumeFile.name.split('.').pop()
        const sanitizedName = formData.fullName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        const timestamp = Date.now()
        resumeFileName = `${timestamp}-${sanitizedName}.${fileExt}`
        
        const { error: uploadError } = await anonymousSupabase.storage
          .from('applications-resumes')
          .upload(resumeFileName, resumeFile, {
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          console.error('Resume upload error:', uploadError)
          setSubmitError('Failed to upload resume. Please try again or submit without a resume.')
          setSubmitting(false)
          return
        }
      }

      // Use anonymous client to ensure no authenticated session is used
      const stateValue = isUnitedStates ? formData.state.trim() : (formData.state.trim() || null)

      const { data, error } = await anonymousSupabase
        .from('applications')
        .insert([{
          email: formData.email.trim().toLowerCase(),
          phone_number: formData.phoneNumber.trim(),
          full_name: formData.fullName.trim(),
          age: ageNum,
          grade: gradeValue.trim(),
          school: formData.school.trim(),
          country: countryTrim,
          state: stateValue,
          hours_per_week: formData.hoursPerWeek,
          additional_info: formData.additionalInfo.trim() || null,
          referral_source: referralValue.trim(),
          referral_friend_name:
            formData.referralSource === FRIEND_REFERRAL ? formData.referralFriendName.trim() : null,
          linkedin_url: formData.linkedinUrl.trim() || null,
          instagram_url: formData.instagramUrl.trim() || null,
          resume_file: resumeFileName,
          status: 'pending'
        }])
        .select()
        .single()

      if (error) {
        console.error('Application submission error:', error)
        setSubmitError('Failed to submit application. Please try again or contact us directly.')
        setSubmitting(false)
        return
      }

      // Success!
      setSubmitSuccess(true)
      setFormData({
        email: '',
        phoneNumber: '',
        fullName: '',
        age: '',
        grade: '',
        gradeOther: '',
        school: '',
        country: 'United States',
        state: '',
        hoursPerWeek: '',
        additionalInfo: '',
        referralSource: '',
        referralSourceOther: '',
        referralFriendName: '',
        linkedinUrl: '',
        instagramUrl: ''
      })
      setResumeFile(null)
    } catch (err) {
      console.error('Error submitting application:', err)
      setSubmitError('An unexpected error occurred. Please try again or contact us directly.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="card shadow-sm border-0" style={{ borderRadius: '16px' }}>
        <div className="card-body p-5 text-center">
          <div className="mb-4">
            <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '4rem' }}></i>
          </div>
          <h3 className="mb-3">Application Submitted!</h3>
          <p className="lead mb-4">
            Thank you for your interest in SPAN. We've received your application and will review it soon.
            You'll hear from us once we've had a chance to review your submission.
          </p>
          <button
            className="btn btn-dark"
            onClick={() => setSubmitSuccess(false)}
          >
            Submit Another Application
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card shadow-sm border-0" style={{ borderRadius: '16px', maxHeight: '650px', display: 'flex', flexDirection: 'column' }}>
      <div className="card-body p-4 p-md-5" style={{ overflowY: 'auto', flex: 1 }}>
        <div className="mb-4">
          <h3 className="mb-2">SPAN Application</h3>
          <p className="text-muted mb-4">
            We're looking for driven high school and college students who are passionate about healthcare justice 
            and ready to make a real impact: from organizing campaigns and researching legislation to running our 
            social media and building national partnerships.
          </p>
          <p className="text-muted mb-0">
            This application helps us learn more about your interests, work ethic, and what you hope to bring to SPAN. 
            We're not looking for resumes, but for initiative, dedication, and heart. <strong>No prior experience is required, 
            just a willingness to learn and lead.</strong>
          </p>
        </div>

        {submitError && (
          <div className="alert alert-danger" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="d-flex flex-column gap-3">
            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">
                Email <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="form-label">
                Phone Number <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                className="form-control"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
              />
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="form-label">
                Full Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            {/* Age */}
            <div>
              <label htmlFor="age" className="form-label">
                Age <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                className="form-control"
                id="age"
                name="age"
                min={13}
                max={120}
                inputMode="numeric"
                placeholder="e.g., 16"
                value={formData.age}
                onChange={handleChange}
                required
              />
            </div>

            {/* Grade */}
            <div>
              <label htmlFor="grade" className="form-label">
                Grade <span className="text-danger">*</span>
              </label>
              <select
                className="form-select"
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                required
              >
                <option value="">Select grade...</option>
                <option value="HS Freshman">HS Freshman</option>
                <option value="HS Sophomore">HS Sophomore</option>
                <option value="HS Junior">HS Junior</option>
                <option value="HS Senior">HS Senior</option>
                <option value="Collegiate/Graduate">Collegiate/Graduate</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Grade Other */}
            {formData.grade === 'Other' && (
              <div>
                <label htmlFor="gradeOther" className="form-label">
                  Please specify <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="gradeOther"
                  name="gradeOther"
                  value={formData.gradeOther}
                  onChange={handleChange}
                  required={formData.grade === 'Other'}
                />
              </div>
            )}

            {/* School */}
            <div>
              <label htmlFor="school" className="form-label">
                School <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="school"
                name="school"
                value={formData.school}
                onChange={handleChange}
                required
              />
            </div>

            {/* Country */}
            <div>
              <label htmlFor="country" className="form-label">
                Country / region <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                id="country"
                name="country"
                list="application-country-suggestions"
                autoComplete="country-name"
                value={formData.country}
                onChange={handleChange}
                placeholder="e.g. United States, Canada, India"
                required
              />
              <datalist id="application-country-suggestions">
                {COUNTRY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <small className="text-muted">Type to search; you can enter any country or territory.</small>
            </div>

            {/* State / province */}
            <div>
              <label htmlFor="state" className="form-label">
                {/^united states$/i.test((formData.country || '').trim())
                  ? (
                    <>
                      State <span className="text-danger">*</span>
                    </>
                  )
                  : (
                    <>
                      State / province / region <span className="text-muted">(optional)</span>
                    </>
                  )}
              </label>
              <input
                type="text"
                className="form-control"
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder={
                  /^united states$/i.test((formData.country || '').trim())
                    ? 'e.g. OH, California'
                    : 'If applicable'
                }
                required={/^united states$/i.test((formData.country || '').trim())}
              />
            </div>

            {/* Hours per Week */}
            <div>
              <label htmlFor="hoursPerWeek" className="form-label">
                How many hours per week are you realistically able to commit to SPAN activities? <span className="text-danger">*</span>
              </label>
              <select
                className="form-select"
                id="hoursPerWeek"
                name="hoursPerWeek"
                value={formData.hoursPerWeek}
                onChange={handleChange}
                required
              >
                <option value="">Select hours...</option>
                <option value="None">None</option>
                <option value="1-2 hours">1-2 hours</option>
                <option value="3-4 hours">3-4 hours</option>
                <option value="5+ hours">5+ hours</option>
              </select>
            </div>

            {/* How'd you hear about SPAN */}
            <div>
              <label htmlFor="referralSource" className="form-label">
                How'd you hear about SPAN? <span className="text-danger">*</span>
              </label>
              <select
                className="form-select"
                id="referralSource"
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                required
              >
                <option value="">Select option...</option>
                <option value={FRIEND_REFERRAL}>A friend or classmate</option>
                <option value="Social media">Social media</option>
                <option value="Teacher or mentor">Teacher or mentor</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Friend / classmate referrer name */}
            {formData.referralSource === FRIEND_REFERRAL && (
              <div>
                <label htmlFor="referralFriendName" className="form-label">
                  Who told you about SPAN? (their name) <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="referralFriendName"
                  name="referralFriendName"
                  value={formData.referralFriendName}
                  onChange={handleChange}
                  autoComplete="name"
                  placeholder="Full name"
                  required={formData.referralSource === FRIEND_REFERRAL}
                />
              </div>
            )}

            {/* Referral Source Other */}
            {formData.referralSource === 'Other' && (
              <div>
                <label htmlFor="referralSourceOther" className="form-label">
                  Please specify <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="referralSourceOther"
                  name="referralSourceOther"
                  value={formData.referralSourceOther}
                  onChange={handleChange}
                  required={formData.referralSource === 'Other'}
                />
              </div>
            )}

            {/* Additional Info */}
            <div>
              <label htmlFor="additionalInfo" className="form-label">
                Tell us about any experience you have in policy, healthcare, advocacy, or related areas. Why are you interested in joining SPAN, and how do you see yourself contributing to our mission? Feel free to include any skills, strengths, or additional information that would help us get to know you better.
              </label>
              <textarea
                className="form-control"
                id="additionalInfo"
                name="additionalInfo"
                rows="6"
                value={formData.additionalInfo}
                onChange={handleChange}
                placeholder="Share your experience, interests, and how you'd like to contribute to SPAN..."
              />
            </div>

            {/* LinkedIn */}
            <div>
              <label htmlFor="linkedinUrl" className="form-label">
                LinkedIn Profile (Optional)
              </label>
              <input
                type="url"
                className="form-control"
                id="linkedinUrl"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>

            {/* Instagram */}
            <div>
              <label htmlFor="instagramUrl" className="form-label">
                Instagram Profile (Optional)
              </label>
              <input
                type="url"
                className="form-control"
                id="instagramUrl"
                name="instagramUrl"
                value={formData.instagramUrl}
                onChange={handleChange}
                placeholder="https://instagram.com/yourprofile"
              />
            </div>

            {/* Resume Upload */}
            <div>
              <label htmlFor="resumeFile" className="form-label">
                Resume (Optional)
              </label>
              <input
                type="file"
                className="form-control"
                id="resumeFile"
                name="resumeFile"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setResumeFile(e.target.files[0] || null)}
              />
              <small className="text-muted">Accepted formats: PDF, DOC, DOCX (Max 10MB)</small>
              {resumeFile && (
                <div className="mt-2">
                  <span className="badge bg-info">
                    <i className="bi bi-file-earmark me-1"></i>
                    {resumeFile.name}
                  </span>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="mt-2">
              <button
                type="submit"
                className="btn btn-dark btn-lg w-100"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send-fill me-2"></i>
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ApplicationForm

