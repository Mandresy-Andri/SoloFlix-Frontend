import React from 'react';
import { Button, Checkbox, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const response = await fetch("https://authorization-service.up.railway.app/auth/oauth/token", {
        method: "POST",
        headers: {
          Authorization: "Basic aHRtbDU6YXBwX3NlY3JldA==",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: values.username,
          password: values.password,
          grant_type: "password",
          scope: "ROLE_USER",
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      } else {
        const { access_token } = await response.json();
        localStorage.setItem("access_token", access_token);
        navigate('/');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  const validateEmail = (rule, value) => {
    if (!value || value.endsWith('@gmail.com')) {
      return Promise.resolve();
    }
    return Promise.reject('Please enter a valid gmail address!');
  };

  return (
    <div className="login-form">
    <Form
      name="basic"
      labelCol={{ span: 8 }}
      wrapperCol={{ span: 16 }}
      style={{ maxWidth: 600, background: 'rgba(0, 0, 0, 0.6)', height: 550, width: 400, paddingLeft: 35, paddingTop:90}}
      initialValues={{ remember: true }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
    >
      <Form.Item>
      <span style={{ color: "white", fontFamily: 'fantasy', fontSize: 20}}>Sign In</span>
    </Form.Item>

      <Form.Item
        name="username"
        rules={[{ required: true, validator: validateEmail }]}
        style={{ width: 500}}
      >
        <Input placeholder="Username"/>
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Please input your password!' }]}
        style={{ width: 500}}
      >
        <Input.Password  placeholder="Password"/>
      </Form.Item>

      <Form.Item name="remember" valuePropName="checked">
        <Checkbox style={{ color: 'white'}}>Remember me</Checkbox>
      </Form.Item>

      <Form.Item>
        <Button style={{ width: 325, backgroundColor: 'red'}} type="primary" htmlType="submit">
          Sign In
        </Button>
      </Form.Item>
    </Form>
    </div>
  );
}

export default Login;
