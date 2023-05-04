import React from 'react';
import { Button, Checkbox, Form, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';

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
      wrapperCol={{ span: '100%'}}
      style={{width:'40%', maxHeight:'50%',padding:'1% 5%', background: 'rgba(0, 0, 0, 0.6)',marginTop:'10%', borderRadius:'25px'}}
      initialValues={{ remember: true }}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
      autoComplete="off"
      layout="vertical"
    >
      <Form.Item>
      <span style={{ color: "white", fontFamily: 'fantasy', fontSize: 20}}>Sign In</span>
    </Form.Item>

      <Form.Item
        name="username"
        rules={[{ required: true, validator: validateEmail }]}
        tooltip={{
          title: 'Tooltip with customize icon',
          icon: <InfoCircleOutlined />,
        }}
        label={
          <span style={{ color: 'white' }}>test: plainUser@gmail.com</span>
        }
      >
        <Input placeholder="Username"/>
      </Form.Item>

      <Form.Item
        name="password"
        rules={[{ required: true, message: 'Please input your password!' }]}
        tooltip={{
          title: 'Tooltip with customize icon',
          icon: <InfoCircleOutlined />,
        }}
        label={
          <span style={{ color: 'white' }}>test: password</span>
        }
      >
        <Input.Password  placeholder="Password"/>
      </Form.Item>

      <Form.Item name="remember" valuePropName="checked">
        <Checkbox style={{ color: 'white'}}>Remember me</Checkbox>
      </Form.Item>

      <Form.Item>
        <Button style={{ width: '100%', backgroundColor: 'red'}} type="primary" htmlType="submit">
          Sign In
        </Button>
      </Form.Item>
    </Form>
    </div>
  );
}

export default Login;
