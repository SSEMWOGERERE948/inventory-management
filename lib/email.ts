import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export async function sendOrderRequestEmail(
  to: string,
  orderRequest: any,
  user: any,
  items: any[]
) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #3B82F6;">New Order Request</h2>
      <p>A new order request has been submitted by <strong>${user.name}</strong> (${user.email})</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${orderRequest.id}</p>
        <p><strong>Total Amount:</strong> $${orderRequest.totalAmount.toFixed(2)}</p>
        <p><strong>Notes:</strong> ${orderRequest.notes || 'None'}</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Items Requested:</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #e9ecef;">
              <th style="padding: 10px; border: 1px solid #dee2e6;">Product</th>
              <th style="padding: 10px; border: 1px solid #dee2e6;">Quantity</th>
              <th style="padding: 10px; border: 1px solid #dee2e6;">Unit Price</th>
              <th style="padding: 10px; border: 1px solid #dee2e6;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${item.product.name}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">${item.quantity}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">$${item.unitPrice.toFixed(2)}</td>
                <td style="padding: 10px; border: 1px solid #dee2e6;">$${item.totalPrice.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <p>Please review and approve/reject this order request in your dashboard.</p>
      <p>Best regards,<br>Inventory Management System</p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `New Order Request from ${user.name}`,
    html,
  })
}

export async function sendOrderStatusEmail(
  to: string,
  orderRequest: any,
  status: string,
  items: any[]
) {
  const statusText = status === 'APPROVED' ? 'approved' : status === 'REJECTED' ? 'rejected' : 'shipped'
  const color = status === 'APPROVED' ? '#10B981' : status === 'REJECTED' ? '#EF4444' : '#3B82F6'

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${color};">Order ${statusText.toUpperCase()}</h2>
      <p>Your order request has been <strong>${statusText}</strong>.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3>Order Details:</h3>
        <p><strong>Order ID:</strong> ${orderRequest.id}</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Total Amount:</strong> $${orderRequest.totalAmount.toFixed(2)}</p>
      </div>

      ${status === 'SHIPPED' ? `
        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Shipping Information:</h3>
          <p>Your order has been shipped and is on its way to you.</p>
          <p><strong>Shipped Date:</strong> ${new Date(orderRequest.shippedAt).toLocaleDateString()}</p>
        </div>
      ` : ''}

      <p>Best regards,<br>Inventory Management System</p>
    </div>
  `

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject: `Order ${statusText} - ${orderRequest.id}`,
    html,
  })
}